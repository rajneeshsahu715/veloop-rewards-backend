import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import UserLevel from "../models/UserLevel.js";
import Level from "../models/Level.js";

dotenv.config();

try {
  await connectDB();

  const userId = "befc1ab0-435a-47f5-b5b6-5d88fa024fd3";

  const userLevel = await UserLevel.findOne({ userId }).lean();

  if (!userLevel) {
    console.log("Test user level record not found");
  } else {
    const currentLevel = await Level.findById(
      userLevel.currentLevelId
    ).lean();

    console.log({
      userId: userLevel.userId,
      totalXP: userLevel.totalXP,
      currentLevel: currentLevel?.levelName || null,
      levelNumber: currentLevel?.levelNumber || null,
    });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
