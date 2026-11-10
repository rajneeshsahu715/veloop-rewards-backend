
import mongoose from "mongoose";

import User from "../models/User.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

const ALLOWED_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
];

export const updateUserStatus = async ({
  userId,
  status,
  reason,
  adminId,
  ipAddress,
}) => {
  if (!userId || typeof userId !== "string") {
    const error = new Error("Valid user ID is required");
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    const error = new Error("Invalid account status");
    error.statusCode = 400;
    throw error;
  }

  if (!adminId || !mongoose.isValidObjectId(adminId)) {
    const error = new Error("Valid admin ID is required");
    error.statusCode = 401;
    throw error;
  }

  if (!reason || !reason.trim()) {
    const error = new Error("Reason for status change is required");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  let updatedUser;

  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ userId }).session(session);

      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }

      if (user.accountStatus === status) {
        const error = new Error(
          `User account is already ${status}`
        );
        error.statusCode = 400;
        throw error;
      }

      const previousStatus = user.accountStatus;

      user.accountStatus = status;
      await user.save({ session });

      const auditLog = new AdminAuditLog({
        adminId,
        action: "USER_STATUS_UPDATED",
        targetType: "USER",
        targetId: user.userId,
        details: {
          previousStatus,
          newStatus: status,
          reason: reason.trim(),
        },
        ipAddress: ipAddress || null,
      });

      await auditLog.save({ session });

      updatedUser = {
        userId: user.userId,
        name: user.name,
        email: user.email,
        previousStatus,
        accountStatus: user.accountStatus,
      };
    });
  } finally {
    await session.endSession();
  }

  return updatedUser;
};
