import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import XPTransaction from "../models/XPTransaction.js";
import ActivityLog from "../models/ActivityLog.js";
import UserLevel from "../models/UserLevel.js";

dotenv.config();

try {
  await connectDB();

  const userId = "befc1ab0-435a-47f5-b5b6-5d88fa024fd3";
  const referenceId = "manual-test-login-2026-11-07";

  const transactions = await XPTransaction.find({
    userId,
    activityType: "DAILY_LOGIN",
    referenceId,
  }).lean();

  const activities = await ActivityLog.find({
    userId,
    activityType: "XP_CREDIT",
    referenceId,
  }).lean();

  const userLevel = await UserLevel.findOne({ userId }).lean();

  console.log({
    xpTransactionCount: transactions.length,
    activityLogCount: activities.length,
    transactionAmount: transactions[0]?.amount,
    activityAmount: activities[0]?.amount,
    totalXP: userLevel?.totalXP,
  });
} catch (error) {
  console.error("Verification failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
