import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import AdminUser from "../models/AdminUser.js";

export const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Admin authentication required.",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin authentication token.",
    });
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error("Admin authentication configuration error");
    error.statusCode = 500;
    return next(error);
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "veloop-admin-auth",
      audience: "veloop-admin",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Admin session has expired. Please log in again."
          : "Invalid admin authentication token.",
    });
  }

  if (
    !decoded ||
    typeof decoded.adminId !== "string" ||
    !mongoose.isValidObjectId(decoded.adminId) ||
    decoded.role !== "SUPER_ADMIN" ||
    !Number.isInteger(decoded.tokenVersion) ||
    decoded.tokenVersion < 0
  ) {
    return res.status(403).json({
      success: false,
      message: "Admin access denied.",
    });
  }

  try {
    const admin = await AdminUser.findById(decoded.adminId)
      .select("_id name email role isActive tokenVersion")
      .lean();

    if (!admin || !admin.isActive || admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive or unauthorized.",
      });
    }

    const currentTokenVersion = Number.isInteger(admin.tokenVersion)
      ? admin.tokenVersion
      : 0;

    if (decoded.tokenVersion !== currentTokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Admin session has been revoked. Please log in again.",
      });
    }

    req.admin = {
      adminId: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
