
import mongoose from "mongoose";

import User from "../models/User.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

const ALLOWED_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
];

const MAX_REASON_LENGTH = 500;
const MAX_IP_ADDRESS_LENGTH = 64;
const MAX_USER_ID_LENGTH = 100;

const createValidationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateReason = (reason) => {
  if (typeof reason !== "string") {
    throw createValidationError(
      "Reason for status change is required"
    );
  }

  const normalizedReason = reason.trim();

  if (!normalizedReason) {
    throw createValidationError(
      "Reason for status change is required"
    );
  }

  if (normalizedReason.length > MAX_REASON_LENGTH) {
    throw createValidationError(
      "Reason cannot exceed 500 characters"
    );
  }

  return normalizedReason;
};

const validateIpAddress = (ipAddress) => {
  if (ipAddress === undefined || ipAddress === null) {
    return null;
  }

  if (
    typeof ipAddress !== "string" ||
    ipAddress.trim().length > MAX_IP_ADDRESS_LENGTH
  ) {
    throw createValidationError("Invalid IP address");
  }

  return ipAddress.trim() || null;
};

export const updateUserStatus = async ({
  userId,
  status,
  reason,
  adminId,
  ipAddress,
}) => {
  if (
    typeof userId !== "string" ||
    !userId.trim() ||
    userId.trim().length > MAX_USER_ID_LENGTH
  ) {
    throw createValidationError("Valid user ID is required");
  }

  if (
    typeof status !== "string" ||
    !ALLOWED_STATUSES.includes(status)
  ) {
    throw createValidationError("Invalid account status");
  }

  if (!mongoose.isValidObjectId(adminId)) {
    throw createValidationError(
      "Valid admin ID is required",
      401
    );
  }

  const normalizedReason = validateReason(reason);
  const normalizedIpAddress = validateIpAddress(ipAddress);

  const session = await mongoose.startSession();

  let updatedUser;

  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({
        userId: userId.trim(),
      }).session(session);

      if (!user) {
        throw createValidationError("User not found", 404);
      }

      if (user.accountStatus === status) {
        throw createValidationError(
          `User account is already ${status}`
        );
      }

      const previousStatus = user.accountStatus;

      // Invalidate all previously issued user JWTs.
      if (
        !Number.isSafeInteger(user.tokenVersion) ||
        user.tokenVersion < 0
      ) {
        throw createValidationError(
          "User token version is invalid",
          500
        );
      }

      user.accountStatus = status;
      user.tokenVersion += 1;

      await user.save({ session });

      const auditLog = new AdminAuditLog({
        adminId,
        action: "USER_STATUS_UPDATED",
        targetType: "USER",
        targetId: user.userId,
        details: {
          previousStatus,
          newStatus: status,
          reason: normalizedReason,
          tokenVersionIncremented: true,
        },
        ipAddress: normalizedIpAddress,
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
