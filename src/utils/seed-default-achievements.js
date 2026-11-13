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

const CASE_INSENSITIVE_COLLATION = {
  locale: "en",
  strength: 2,
};

const findExistingAchievement = async (achievementName) => {
  return Achievement.findOne({
    achievementName,
  }).collation(CASE_INSENSITIVE_COLLATION);
};

const seedAchievements = async () => {
  let created = 0;
  let skipped = 0;

  try {
    await connectDB();

    for (const data of DEFAULT_ACHIEVEMENTS) {
      const existing = await findExistingAchievement(
        data.achievementName
      );

      if (existing) {
        skipped++;
        console.log(`SKIPPED: ${data.achievementName} already exists.`);
        continue;
      }

      try {
        await Achievement.create({
          ...data,
          isActive: true,
          badgeReference: null,
        });

        created++;
        console.log(`CREATED: ${data.achievementName}`);
      } catch (error) {
        if (error.code === 11000) {
          const duplicate = await findExistingAchievement(
            data.achievementName
          );

          if (duplicate) {
            skipped++;
            console.log(
              `SKIPPED: ${data.achievementName} was created by another process.`
            );
            continue;
          }
        }

        throw error;
      }
    }

    const total = await Achievement.countDocuments();

    console.log("\n========== ACHIEVEMENT SEED SUMMARY ==========");
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total achievements: ${total}`);
    console.log("Achievement seeding completed successfully.");
  } catch (error) {
    console.error("Achievement seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAchievements();
