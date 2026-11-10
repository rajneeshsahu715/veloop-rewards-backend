import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Withdrawal from "../models/Withdrawal.js";
import Referral from "../models/Referral.js";
import ActivityLog from "../models/ActivityLog.js";

export const getAdminDashboard = async () => {
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    pendingWithdrawals,
    totalReferrals,
    walletBalances,
    recentActivities,
  ] = await Promise.all([
    User.countDocuments(),

    User.countDocuments({
      accountStatus: "ACTIVE",
    }),

    User.countDocuments({
      accountStatus: "SUSPENDED",
    }),

    Withdrawal.countDocuments({
      status: "PENDING",
    }),

    Referral.countDocuments(),

    Wallet.aggregate([
      {
        $group: {
          _id: "$currencyType",
          availableBalance: {
            $sum: "$availableBalance",
          },
          reservedBalance: {
            $sum: "$reservedBalance",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]),

    ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "userId activityType description amount currencyType status createdAt"
      )
      .lean(),
  ]);

  return {
    overview: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingWithdrawals,
      totalReferrals,
    },

    walletBalances,

    recentActivities,
  };
};