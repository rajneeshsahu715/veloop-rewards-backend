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

const MAX_PAGE = 10000;
const MAX_LIMIT = 100;

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parsePaginationValue = (value, fallback, field, max) => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    value = value.trim();

    if (!/^\d+$/.test(value)) {
      throw createValidationError(`Invalid ${field}`);
    }
  } else if (typeof value !== "number") {
    throw createValidationError(`Invalid ${field}`);
  }

  const parsedValue = Number(value);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > max
  ) {
    throw createValidationError(`Invalid ${field}`);
  }

  return parsedValue;
};

const getAdminAuditLogs = async ({
  page = 1,
  limit = 10,
  targetType = "",
  action = "",
  adminId = "",
} = {}) => {
  const currentPage = parsePaginationValue(
    page,
    1,
    "page",
    MAX_PAGE
  );

  const perPage = parsePaginationValue(
    limit,
    10,
    "limit",
    MAX_LIMIT
  );

  const filter = {};

  if (targetType !== "") {
    if (
      typeof targetType !== "string" ||
      !ALLOWED_TARGET_TYPES.includes(targetType)
    ) {
      throw createValidationError("Invalid audit target type");
    }

    filter.targetType = targetType;
  }

  if (action !== "") {
    if (
      typeof action !== "string" ||
      action.trim().length === 0 ||
      action.trim().length > 150
    ) {
      throw createValidationError("Invalid audit action filter");
    }

    filter.action = action.trim();
  }

  if (adminId !== "") {
    if (
      typeof adminId !== "string" ||
      !mongoose.Types.ObjectId.isValid(adminId)
    ) {
      throw createValidationError("Invalid admin ID filter");
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
