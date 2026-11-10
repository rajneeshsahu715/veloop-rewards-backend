
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import UserLevel from "../models/UserLevel.js";
import Level from "../models/Level.js";
import UserAchievement from "../models/UserAchievement.js";
import Withdrawal from "../models/Withdrawal.js";
import Referral from "../models/Referral.js";
import ActivityLog from "../models/ActivityLog.js";

const getWithdrawalStatistics = async (userId) => {
  const statistics = await Withdrawal.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const result = {
    totalWithdrawals: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    totalRequestedAmount: 0,
  };

  for (const item of statistics) {
    result.totalWithdrawals += item.count;
    result.totalRequestedAmount += item.totalAmount;

    const key = item._id?.toLowerCase();

    if (key && Object.hasOwn(result, key)) {
      result[key] = item.count;
    }
  }

  return result;
};

const getReferralStatistics = async (userId) => {
  const [made, received] = await Promise.all([
    Referral.aggregate([
      { $match: { referrerUserId: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    Referral.countDocuments({ referredUserId: userId }),
  ]);

  const result = {
    totalReferrals: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    referralsReceived: received,
  };

  for (const item of made) {
    result.totalReferrals += item.count;

    const key = item._id?.toLowerCase();

    if (key && Object.hasOwn(result, key)) {
      result[key] = item.count;
    }
  }

  return result;
};

const getLevelProgress = async (userId) => {
  const levelProgress = await UserLevel.findOne({ userId })
    .select("totalXP currentLevelId")
    .populate(
      "currentLevelId",
      "levelNumber levelName xpThreshold displayOrder badgeReference"
    )
    .lean();

  if (!levelProgress) {
    return null;
  }

  const nextLevel = levelProgress.currentLevelId
    ? await Level.findOne({
        isActive: true,
        displayOrder: {
          $gt: levelProgress.currentLevelId.displayOrder,
        },
        xpThreshold: {
          $gt: levelProgress.totalXP,
        },
      })
        .sort({ displayOrder: 1 })
        .select(
          "levelNumber levelName xpThreshold displayOrder badgeReference"
        )
        .lean()
    : null;

  return {
    totalXP: levelProgress.totalXP,
    currentLevel: levelProgress.currentLevelId || null,
    nextLevel,
    xpToNextLevel: nextLevel
      ? Math.max(0, nextLevel.xpThreshold - levelProgress.totalXP)
      : null,
  };
};

export const getUserProfile = async (authenticatedUserId) => {
  if (
    typeof authenticatedUserId !== "string" ||
    !authenticatedUserId.trim()
  ) {
    const error = new Error("Authenticated user ID is required");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findOne({
    userId: authenticatedUserId,
  })
    .select(
      "userId name email profileImage referralCode accountStatus emailVerified createdAt"
    )
    .lean();

  if (!user) {
    const error = new Error("User profile not found");
    error.statusCode = 404;
    throw error;
  }

  const [
    wallets,
    levelProgress,
    achievements,
    withdrawalStatistics,
    referralStatistics,
    recentActivity,
  ] = await Promise.all([
    Wallet.find({ userId: authenticatedUserId })
      .select("currencyType availableBalance reservedBalance")
      .lean(),

    getLevelProgress(authenticatedUserId),

    UserAchievement.find({ userId: authenticatedUserId })
      .sort({ unlockedAt: -1, createdAt: -1 })
      .populate(
        "achievementId",
        "achievementName description badgeReference unlockConditions isActive"
      )
      .lean(),

    getWithdrawalStatistics(authenticatedUserId),

    getReferralStatistics(authenticatedUserId),

    ActivityLog.find({ userId: authenticatedUserId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "activityType description amount currencyType status referenceId createdAt"
      )
      .lean(),
  ]);

  return {
    user: {
      ...user,
      memberSince: user.createdAt,
    },
    wallets,
    levelProgress,
    achievements,
    withdrawalStatistics,
    referralStatistics,
    recentActivity,
    accountSecurity: {
      accountStatus: user.accountStatus,
      emailVerified:
        typeof user.emailVerified === "boolean"
          ? user.emailVerified
          : null,
    },
  };
};
