import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js";

export const loginAdmin = async (email, password) => {
  // Validate input
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  // Check JWT configuration
  if (!process.env.JWT_SECRET) {
    const error = new Error("Authentication configuration error");
    error.statusCode = 500;
    throw error;
  }

  // Find admin by email
  const admin = await AdminUser.findOne({
    email: email.trim().toLowerCase(),
  }).select("+passwordHash");

  // Reject invalid credentials
  if (!admin) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Check whether admin account is active
  if (!admin.isActive) {
    const error = new Error("Admin account is inactive");
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(
    password,
    admin.passwordHash
  );

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Update last login timestamp
  admin.lastLoginAt = new Date();
  await admin.save();

  // Generate Admin JWT with issuer and audience restrictions
  const token = jwt.sign(
    {
      adminId: admin._id.toString(),
      role: admin.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "1h",
      issuer: "veloop-admin-auth",
      audience: "veloop-admin",
    }
  );

  // Return safe admin information
  return {
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    },
  };
};
