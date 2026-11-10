import mongoose from "mongoose";

import Referral from "../models/Referral.js";
import User from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import XPTransaction from "../models/XPTransaction.js";
import ActivityLog from "../models/ActivityLog.js";

const ALLOWED_STATUSES = [
  "PENDING",
  "COMPLETED",
  "CANCELLED",
];

const createReferralError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getSafeUserMap = async (userIds) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const users = await User.find({
    userId: { $in: uniqueUserIds },
  })
    .select("userId name email accountStatus")
    .lean();

  return new Map(users.map((user) => [user.userId, user]));
};

const attachUserDetails = async (referrals) => {
  const userIds = referrals.flatMap((referral) => [
    referral.referrerUserId,
    referral.referredUserId,
  ]);

  const userMap = await getSafeUserMap(userIds);

  return referrals.map((referral) => ({
    ...referral,
    referrerUser: userMap.get(referral.referrerUserId) || null,
    referredUser: userMap.get(referral.referredUserId) || null,
  }));
};

export const getAllReferrals = async ({
  page = 1,
  limit = 10,
  status = "",
  search = "",
} = {}) => {
  const currentPage = Math.max(
    1,
    Number.parseInt(page, 10) || 1
  );

  const perPage = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  const filter = {};

  if (status) {
    const normalizedStatus = String(status).trim().toUpperCase();

    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      throw createReferralError("Invalid referral status filter");
    }

    filter.status = normalizedStatus;
  }

  if (search) {
    const searchValue = String(search).trim();

    if (searchValue.length > 100) {
      throw createReferralError("Search query is too long");
    }

    const escapedSearch = searchValue.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    filter.referralCode = {
      $regex: escapedSearch,
      $options: "i",
    };
  }

  const [referrals, totalReferrals] = await Promise.all([
    Referral.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),

    Referral.countDocuments(filter),
  ]);

  const referralsWithUsers = await attachUserDetails(referrals);

  return {
    referrals: referralsWithUsers,
    pagination: {
      currentPage,
      perPage,
      totalReferrals,
      totalPages: Math.ceil(totalReferrals / perPage),
    },
  };
};

export const getReferralById = async (referralId) => {
  if (
    !referralId ||
    !mongoose.Types.ObjectId.isValid(referralId)
  ) {
    throw createReferralError("Invalid referral ID");
  }

  const referral = await Referral.findById(referralId).lean();

  if (!referral) {
    throw createReferralError("Referral not found", 404);
  }

  const [referralWithUsers] = await attachUserDetails([referral]);

  const referralReferenceId = String(referral._id);

  const participantIds = [
    referral.referrerUserId,
    referral.referredUserId,
  ];

  const [
    walletTransactions,
    xpTransactions,
    activityLogs,
  ] = await Promise.all([
    WalletTransaction.find({
      userId: { $in: participantIds },
      referenceId: referralReferenceId,
    })
      .sort({ createdAt: -1 })
      .lean(),

    XPTransaction.find({
      userId: { $in: participantIds },
      activityType: "REFERRAL_REWARD",
      referenceId: referralReferenceId,
    })
      .sort({ createdAt: -1 })
      .lean(),

    ActivityLog.find({
      userId: { $in: participantIds },
      activityType: "REFERRAL_REWARD",
      referenceId: referralReferenceId,
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return {
    ...referralWithUsers,
    rewardRecords: {
      walletTransactions,
      xpTransactions,
      activityLogs,
    },
  };
};
