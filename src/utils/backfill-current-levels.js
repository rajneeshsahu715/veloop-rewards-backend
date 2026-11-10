import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Level from "../models/Level.js";
import UserLevel from "../models/UserLevel.js";

dotenv.config();

const backfillCurrentLevels = async () => {
  try {
    await connectDB();

    const levels = await Level.find({ isActive: true })
      .sort({ xpThreshold: -1, displayOrder: -1 })
      .lean();

    if (levels.length === 0) {
      throw new Error("No active levels found. Seed levels first.");
    }

    const userLevels = await UserLevel.find();

    let updated = 0;
    let unchanged = 0;

    for (const userLevel of userLevels) {
      const currentXP = userLevel.totalXP || 0;

      const matchingLevel = levels.find(
        (level) => level.xpThreshold <= currentXP
      );

      const newLevelId = matchingLevel?._id || null;

      if (
        String(userLevel.currentLevelId || "") ===
        String(newLevelId || "")
      ) {
        unchanged++;
        continue;
      }

      userLevel.currentLevelId = newLevelId;
      await userLevel.save();

      console.log(
        "Current level updated:",
        userLevel.userId,
        "->",
        matchingLevel?.levelName || "No active level"
      );

      updated++;
    }

    console.log("\nCurrent level backfill completed.");
    console.log({
      totalUserLevels: userLevels.length,
      updated,
      unchanged,
    });
  } catch (error) {
    console.error("Current level backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

backfillCurrentLevels();
