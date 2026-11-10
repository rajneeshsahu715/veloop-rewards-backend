import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Level from "../models/Level.js";

dotenv.config();

const DEFAULT_LEVELS = [
  { levelNumber: 1, levelName: "Beginner", xpThreshold: 0, displayOrder: 1 },
  { levelNumber: 2, levelName: "Explorer", xpThreshold: 100, displayOrder: 2 },
  { levelNumber: 3, levelName: "Achiever", xpThreshold: 250, displayOrder: 3 },
  { levelNumber: 4, levelName: "Performer", xpThreshold: 500, displayOrder: 4 },
  { levelNumber: 5, levelName: "Champion", xpThreshold: 1000, displayOrder: 5 },
  { levelNumber: 6, levelName: "Elite", xpThreshold: 2000, displayOrder: 6 },
  { levelNumber: 7, levelName: "Master", xpThreshold: 3500, displayOrder: 7 },
  { levelNumber: 8, levelName: "Legend", xpThreshold: 5500, displayOrder: 8 },
  { levelNumber: 9, levelName: "Grandmaster", xpThreshold: 8000, displayOrder: 9 },
  { levelNumber: 10, levelName: "VELoop Legend", xpThreshold: 11000, displayOrder: 10 },
];

const seedLevels = async () => {
  try {
    await connectDB();

    let created = 0;
    let skipped = 0;

    for (const levelData of DEFAULT_LEVELS) {
      const existingLevel = await Level.findOne({
        levelNumber: levelData.levelNumber,
      });

      if (existingLevel) {
        console.log(
          "Existing level preserved:",
          existingLevel.levelNumber,
          existingLevel.levelName
        );
        skipped++;
        continue;
      }

      const displayOrderExists = await Level.findOne({
        displayOrder: levelData.displayOrder,
      });

      if (displayOrderExists) {
        throw new Error(
          `Display order ${levelData.displayOrder} is already used by another level`
        );
      }

      await Level.create({
        ...levelData,
        isActive: true,
        unlockConditions: null,
        badgeReference: null,
      });

      console.log("Level created:", levelData.levelNumber, levelData.levelName);
      created++;
    }

    const allLevels = await Level.find()
      .sort({ displayOrder: 1, levelNumber: 1 })
      .select("levelNumber levelName xpThreshold displayOrder isActive")
      .lean();

    console.log("\nLevel seeding completed.");
    console.log({ created, skipped, totalLevels: allLevels.length });
    console.table(allLevels);
  } catch (error) {
    console.error("Level seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedLevels();
