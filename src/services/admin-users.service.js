import User from "../models/User.js";

const MAX_PAGE = 10000;
const MAX_LIMIT = 100;

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePaginationValue = (value, fallback, field, max) => {
  if (value === undefined) {
    return fallback;
  }

  const normalizedValue =
    typeof value === "string" ? value.trim() : value;

  if (
    normalizedValue === "" ||
    typeof normalizedValue === "boolean" ||
    !/^\d+$/.test(String(normalizedValue))
  ) {
    throw createError(`Invalid ${field}`);
  }

  const parsedValue = Number(normalizedValue);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > max
  ) {
    throw createError(`Invalid ${field}`);
  }

  return parsedValue;
};

export const getAllUsers = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
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

  if (typeof search !== "string") {
    throw createError("Invalid search value");
  }

  if (search.length > 100) {
    throw createError("Search value cannot exceed 100 characters");
  }

  if (typeof status !== "string") {
    throw createError("Invalid account status");
  }

  const normalizedSearch = search.trim();
  const normalizedStatus = status.trim().toUpperCase();

  const filter = {};

  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const searchRegex = new RegExp(escapedSearch, "i");

    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { referralCode: searchRegex },
    ];
  }

  if (normalizedStatus) {
    const allowedStatuses = [
      "ACTIVE",
      "SUSPENDED",
      "DEACTIVATED",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      throw createError("Invalid account status");
    }

    filter.accountStatus = normalizedStatus;
  }

  const skip = (currentPage - 1) * perPage;

  const [users, totalUsers] = await Promise.all([
    User.find(filter)
      .select(
        "userId name email profileImage referralCode accountStatus emailVerified createdAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),

    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      currentPage,
      perPage,
      totalUsers,
      totalPages: Math.ceil(totalUsers / perPage),
    },
  };
};
