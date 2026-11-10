
import mongoose from "mongoose";
import AdminAuditLog from "../models/AdminAuditLog.js";

const ALLOWED_TARGET_TYPES = [
  "USER",
  "WALLET",
  "WITHDRAWAL",
  "LEVEL",
  "ACHIEVEMENT",
  "REFERRAL",
  "SYSTEM",
];

const getAdminAuditLogs = async ({
  page = 1,
  limit = 10,
  targetType = "",
  action = "",
  adminId = "",
} = {}) => {
  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  const filter = {};

  if (targetType) {
    if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
      throw new Error("Invalid audit target type");
    }

    filter.targetType = targetType;
  }

  if (action) {
    if (typeof action !== "string" || action.trim().length > 150) {
      throw new Error("Invalid audit action filter");
    }

    filter.action = action.trim();
  }

  if (adminId) {
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new Error("Invalid admin ID filter");
    }

    filter.adminId = adminId;
  }

  const [logs, totalLogs] = await Promise.all([
    AdminAuditLog.find(filter)
      .populate("adminId", "name email role")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),

    AdminAuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      currentPage,
      perPage,
      totalLogs,
      totalPages: Math.ceil(totalLogs / perPage),
    },
  };
};

export { getAdminAuditLogs };
