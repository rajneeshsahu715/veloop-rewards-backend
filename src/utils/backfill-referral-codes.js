import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import User from "../models/User.js";
import { generateUniqueReferralCode } from "../services/referral-code.service.js";

dotenv.config();

const backfillReferralCodes = async () => {
  try {
    await connectDB();

    const users = await User.find({
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: "" },
      ],
    }).select("userId name email referralCode");

    console.log("Users requiring referral codes:", users.length);

    for (const user of users) {
      const referralCode = await generateUniqueReferralCode();

      const result = await User.updateOne(
        {
          _id: user._id,
          $or: [
            { referralCode: { $exists: false } },
            { referralCode: null },
            { referralCode: "" },
          ],
        },
        {
          $set: { referralCode },
        }
      );

      if (result.modifiedCount === 1) {
        console.log("Referral code created:", {
          userId: user.userId,
          referralCode,
        });
      } else {
        console.log("User skipped; referral code already assigned:", user.userId);
      }
    }

    const totalUsers = await User.countDocuments();
    const usersWithCodes = await User.countDocuments({
      referralCode: { $exists: true, $nin: [null, ""] },
    });

    console.log("\nReferral code backfill completed.");
    console.log({ totalUsers, usersWithCodes });
  } catch (error) {
    console.error("Referral code backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

backfillReferralCodes();
