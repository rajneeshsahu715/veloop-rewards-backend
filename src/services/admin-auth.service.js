import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import AdminUser from "../models/AdminUser.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

const createAuthError = () => {
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  return error;
};

export const loginAdmin = async (
  email,
  password,
  ipAddress = null
) => {
  if (
    typeof email !== "string" ||
    !email.trim() ||
    email.trim().length > 254
  ) {
    const error = new Error("Valid email is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    const error = new Error("Valid email is required");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof password !== "string" ||
    password.length === 0 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    const error = new Error("Valid password is required");
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error("Authentication configuration error");
    error.statusCode = 500;
    throw error;
  }

  const admin = await AdminUser.findOne({
    email: normalizedEmail,
  }).select("+passwordHash");

  if (!admin || !admin.isActive) {
    throw createAuthError();
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    admin.passwordHash
  );

  if (!isPasswordValid || admin.role !== "SUPER_ADMIN") {
    throw createAuthError();
  }

  const loginAt = new Date();

  const safeIpAddress =
    typeof ipAddress === "string" && ipAddress.length <= 100
      ? ipAddress
      : null;

  const session = await mongoose.startSession();

  let token;
  let authenticatedAdmin;

  try {
    await session.withTransaction(async () => {
      const currentAdmin = await AdminUser.findById(admin._id)
        .select("+passwordHash")
        .session(session);

      if (
        !currentAdmin ||
        !currentAdmin.isActive ||
        currentAdmin.role !== "SUPER_ADMIN"
      ) {
        throw createAuthError();
      }

      // Reject login if password changed after initial verification.
      if (currentAdmin.passwordHash !== admin.passwordHash) {
        throw createAuthError();
      }

      const tokenVersion = Number.isInteger(currentAdmin.tokenVersion)
        ? currentAdmin.tokenVersion
        : 0;

      currentAdmin.tokenVersion = tokenVersion;
      currentAdmin.lastLoginAt = loginAt;

      await currentAdmin.save({ session });

      token = jwt.sign(
        {
          adminId: currentAdmin._id.toString(),
          role: currentAdmin.role,
          tokenVersion,
        },
        process.env.JWT_SECRET,
        {
          algorithm: "HS256",
          expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "1h",
          issuer: "veloop-admin-auth",
          audience: "veloop-admin",
        }
      );

      const auditLog = new AdminAuditLog({
        adminId: currentAdmin._id,
        action: "ADMIN_LOGIN_SUCCESS",
        targetType: "SYSTEM",
        targetId: currentAdmin._id.toString(),
        details: {
          role: currentAdmin.role,
          loginAt,
        },
        ipAddress: safeIpAddress,
      });

      await auditLog.save({ session });

      authenticatedAdmin = {
        id: currentAdmin._id,
        name: currentAdmin.name,
        email: currentAdmin.email,
        role: currentAdmin.role,
        lastLoginAt: currentAdmin.lastLoginAt,
      };
    });
  } finally {
    await session.endSession();
  }

  return {
    token,
    admin: authenticatedAdmin,
  };
};

export const logoutAdmin = async (
  adminId,
  ipAddress = null
) => {
  if (!mongoose.isValidObjectId(adminId)) {
    const error = new Error("Invalid admin ID");
    error.statusCode = 400;
    throw error;
  }

  const safeIpAddress =
    typeof ipAddress === "string" && ipAddress.length <= 100
      ? ipAddress
      : null;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const admin = await AdminUser.findById(adminId).session(session);

      if (!admin || !admin.isActive || admin.role !== "SUPER_ADMIN") {
        const error = new Error("Admin account is inactive or unauthorized");
        error.statusCode = 403;
        throw error;
      }

      const currentVersion = Number.isInteger(admin.tokenVersion)
        ? admin.tokenVersion
        : 0;

      admin.tokenVersion = currentVersion + 1;

      await admin.save({ session });

      const auditLog = new AdminAuditLog({
        adminId: admin._id,
        action: "ADMIN_LOGOUT",
        targetType: "SYSTEM",
        targetId: admin._id.toString(),
        details: {
          role: admin.role,
          tokenVersion: admin.tokenVersion,
          loggedOutAt: new Date(),
        },
        ipAddress: safeIpAddress,
      });

      await auditLog.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return {
    loggedOut: true,
  };
};
