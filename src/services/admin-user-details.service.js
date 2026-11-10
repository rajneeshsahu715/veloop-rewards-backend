import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import UserLevel from "../models/UserLevel.js";
import UserAchievement from "../models/UserAchievement.js";
import Referral from "../models/Referral.js";
import Withdrawal from "../models/Withdrawal.js";
import ActivityLog from "../models/ActivityLog.js";

export const getUserDetails = async (userId) => {
  if (!userId || typeof userId !== "string") {
    const error = new Error("Valid user ID is required");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ userId })
    .select(
      "userId name email profileImage referralCode accountStatus emailVerified createdAt updatedAt"
    )
    .lean();

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const [
    wallets,
    levelProgress,
    achievements,
    referrals,
    withdrawals,
    recentActivities,
  ] = await Promise.all([
    Wallet.find({ userId })
      .select("currencyType availableBalance reservedBalance")
      .lean(),

    UserLevel.findOne({ userId })
      .select("totalXP currentLevelId")
      .populate(
        "currentLevelId",
        "levelNumber levelName xpThreshold"
      )
      .lean(),

    UserAchievement.find({ userId })
      .populate(
        "achievementId",
        "achievementName description badgeReference"
      )
      .sort({ unlockedAt: -1 })
      .lean(),

    Referral.countDocuments({ referrerUserId: userId }),

    Withdrawal.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "amount currencyType status rejectionReason createdAt updatedAt"
      )
      .lean(),

    ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "activityType description amount currencyType status referenceId createdAt"
      )
      .lean(),
  ]);

  return {
    user,
    wallets,
    levelProgress: levelProgress || null,
    achievements,
    referralCount: referrals,
    withdrawals,
    recentActivities,
  };
};