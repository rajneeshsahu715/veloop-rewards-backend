import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import AdminUser from "../models/AdminUser.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

dotenv.config();

const resetAdminPassword = async () => {
  let connected = false;

  try {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (
      typeof ADMIN_EMAIL !== "string" ||
      !ADMIN_EMAIL.trim() ||
      typeof ADMIN_PASSWORD !== "string" ||
      !ADMIN_PASSWORD
    ) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env"
      );
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("Password must contain at least 12 characters");
    }

    if (Buffer.byteLength(ADMIN_PASSWORD, "utf8") > 72) {
      throw new Error("Password cannot exceed 72 UTF-8 bytes");
    }

    const email = ADMIN_EMAIL.trim().toLowerCase();

    await connectDB();
    connected = true;

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const admin = await AdminUser.findOne({ email }).session(session);

        if (!admin) {
          throw new Error("Admin account not found");
        }

        if (!admin.isActive || admin.role !== "SUPER_ADMIN") {
          throw new Error("Admin account is inactive or unauthorized");
        }

        const currentVersion = Number.isInteger(admin.tokenVersion)
          ? admin.tokenVersion
          : 0;

        admin.passwordHash = passwordHash;
        admin.tokenVersion = currentVersion + 1;

        await admin.save({ session });

        const auditLog = new AdminAuditLog({
          adminId: admin._id,
          action: "ADMIN_PASSWORD_RESET",
          targetType: "SYSTEM",
          targetId: admin._id.toString(),
          details: {
            role: admin.role,
            tokenVersion: admin.tokenVersion,
            resetAt: new Date(),
          },
        });

        await auditLog.save({ session });
      });

      console.log("Admin password updated successfully.");
      console.log("Existing admin sessions revoked successfully.");
      console.log("Admin password reset audit recorded successfully.");
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connected) {
      await mongoose.disconnect();
    }
  }
};

resetAdminPassword();
