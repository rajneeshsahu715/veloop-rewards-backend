import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Achievement from "../models/Achievement.js";

dotenv.config();

const DEFAULT_ACHIEVEMENTS = [
  {
    achievementName: "First Login",
    description: "Complete your first successful login.",
    unlockConditions: {
      type: "FIRST_LOGIN",
      target: 1,
    },
  },
  {
    achievementName: "Profile Master",
    description: "Complete 100% of your user profile.",
    unlockConditions: {
      type: "PROFILE_COMPLETION",
      target: 100,
    },
  },
  {
    achievementName: "XP Explorer",
    description: "Earn a total of 100 XP.",
    unlockConditions: {
      type: "TOTAL_XP",
      target: 100,
    },
  },
  {
    achievementName: "Referral Starter",
    description: "Complete your first successful referral.",
    unlockConditions: {
      type: "SUCCESSFUL_REFERRALS",
      target: 1,
    },
  },
  {
    achievementName: "Referral Champion",
    description: "Complete five successful referrals.",
    unlockConditions: {
      type: "SUCCESSFUL_REFERRALS",
      target: 5,
    },
  },
];

const seedAchievements = async () => {
  try {
    await connectDB();

    let created = 0;
    let skipped = 0;

    for (const data of DEFAULT_ACHIEVEMENTS) {
      const existing = await Achievement.findOne({
        achievementName: data.achievementName,
      });

      if (existing) {
        skipped++;
        continue;
      }

      await Achievement.create({
        ...data,
        isActive: true,
        badgeReference: null,
      });

      created++;
    }

    const total = await Achievement.countDocuments();

    console.log({
      created,
      skipped,
      totalAchievements: total,
    });

    console.log("Achievement seeding completed successfully.");
  } catch (error) {
    console.error("Achievement seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAchievements();
