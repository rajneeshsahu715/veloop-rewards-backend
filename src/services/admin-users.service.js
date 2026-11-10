import User from "../models/User.js";

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const getAllUsers = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
} = {}) => {
  const currentPage = Math.max(1, Number(page) || 1);

  const perPage = Math.min(
    100,
    Math.max(1, Number(limit) || 10)
  );

  const filter = {};

  if (search.trim()) {
    const safeSearch = escapeRegex(search.trim());

    filter.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { email: { $regex: safeSearch, $options: "i" } },
      { referralCode: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (status) {
    const allowedStatuses = [
      "ACTIVE",
      "SUSPENDED",
      "DEACTIVATED",
    ];

    if (!allowedStatuses.includes(status.toUpperCase())) {
      const error = new Error("Invalid account status");
      error.statusCode = 400;
      throw error;
    }

    filter.accountStatus = status.toUpperCase();
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