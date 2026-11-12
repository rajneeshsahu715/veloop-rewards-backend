import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js";

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required.",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication credentials.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "veloop-admin-auth",
      audience: "veloop-admin",
    });

    if (
      typeof decoded.adminId !== "string" ||
      !decoded.adminId.trim() ||
      decoded.role !== "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access denied.",
      });
    }

    const admin = await AdminUser.findById(decoded.adminId)
      .select("_id name email role isActive")
      .lean();

    if (!admin || !admin.isActive || admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive or unauthorized.",
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
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Admin session has expired. Please log in again."
          : "Invalid admin authentication token.",
    });
  }
};
