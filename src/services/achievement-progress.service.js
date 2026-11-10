import mongoose from "mongoose";

import Achievement from "../models/Achievement.js";
import UserAchievement from "../models/UserAchievement.js";
import User from "../models/User.js";
import UserLevel from "../models/UserLevel.js";
import Referral from "../models/Referral.js";

import { awardXP } from "./xp-reward.service.js";

const getAchievementProgress = async ({
  achievement,
  userId,
  triggerType,
  session,
}) => {
  const condition = achievement.unlockConditions;

  if (!condition || typeof condition !== "object") {
    throw new Error(
      `Invalid unlock conditions for achievement: ${achievement.achievementName}`
    );
  }

  const target = Number(condition.target);

  if (!Number.isFinite(target) || target <= 0) {
    throw new Error(
      `Invalid achievement target: ${achievement.achievementName}`
    );
  }

  let current = 0;

  switch (condition.type) {
    case "FIRST_LOGIN": {
      const existingAchievement = await UserAchievement.findOne({
        userId,
        achievementId: achievement._id,
      })
        .select("progress unlockedAt")
        .session(session);

      if (existingAchievement?.unlockedAt) {
        current = target;
      } else if (triggerType === "LOGIN") {
        current = 1;
      } else {
        current = Math.max(
          0,
          Number(existingAchievement?.progress?.current) || 0
        );
      }

      break;
    }

    case "PROFILE_COMPLETION": {
      const user = await User.findOne({ userId })
        .select("name email profileImage")
        .session(session);

      if (!user) {
        throw new Error(
          "User not found while checking profile achievement"
        );
      }

      const completedFields = [
        Boolean(user.name?.trim()),
        Boolean(user.email?.trim()),
        Boolean(user.profileImage?.trim()),
      ].filter(Boolean).length;

      current = Math.round((completedFields / 3) * 100);
      break;
    }

    case "TOTAL_XP": {
      const userLevel = await UserLevel.findOne({ userId })
        .select("totalXP")
        .session(session);

      current = userLevel?.totalXP || 0;
      break;
    }

    case "SUCCESSFUL_REFERRALS": {
      current = await Referral.countDocuments({
        referrerUserId: userId,
        status: "COMPLETED",
      }).session(session);

      break;
    }

    default:
      throw new Error(
        `Unsupported achievement condition: ${condition.type}`
      );
  }

  const percentage = Math.min(
    100,
    Math.round((current / target) * 10000) / 100
  );

  return {
    current,
    target,
    percentage,
    completed: current >= target,
  };
};

const evaluateAchievementsInTransaction = async ({
  userId,
  triggerType,
  session,
}) => {
  const achievements = await Achievement.find({
    isActive: true,
  })
    .sort({ createdAt: 1 })
    .session(session);

  const results = [];

  for (const achievement of achievements) {
    const progress = await getAchievementProgress({
      achievement,
      userId,
      triggerType,
      session,
    });

    let userAchievement = await UserAchievement.findOneAndUpdate(
      {
        userId,
        achievementId: achievement._id,
      },
      {
        $set: {
          progress: {
            current: progress.current,
            target: progress.target,
            percentage: progress.percentage,
          },
        },
        $setOnInsert: {
          userId,
          achievementId: achievement._id,
          unlockedAt: null,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
        session,
      }
    );

    if (userAchievement.unlockedAt) {
      results.push({
        achievementName: achievement.achievementName,
        unlocked: true,
        newlyUnlocked: false,
        progress,
      });

      continue;
    }

    if (!progress.completed) {
      results.push({
        achievementName: achievement.achievementName,
        unlocked: false,
        newlyUnlocked: false,
        progress,
      });

      continue;
    }

    userAchievement = await UserAchievement.findOneAndUpdate(
      {
        _id: userAchievement._id,
        unlockedAt: null,
      },
      {
        $set: {
          unlockedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        session,
      }
    );

    if (!userAchievement) {
      results.push({
        achievementName: achievement.achievementName,
        unlocked: true,
        newlyUnlocked: false,
        progress,
      });

      continue;
    }

    const xpResult = await awardXP({
      userId,
      activityType: "ACHIEVEMENT_UNLOCK",
      referenceId: achievement._id.toString(),
      session,
    });

    if (!xpResult.awarded) {
      throw new Error(
        `Achievement XP reward could not be awarded: ${achievement.achievementName}`
      );
    }

    results.push({
      achievementName: achievement.achievementName,
      unlocked: true,
      newlyUnlocked: true,
      xpAwarded: xpResult.amount,
      progress,
    });
  }

  return results;
};

export const evaluateAchievements = async ({
  userId,
  triggerType = "GENERAL",
  session: externalSession = null,
}) => {
  if (!userId || typeof userId !== "string") {
    throw new Error("Valid user ID is required");
  }

  const allowedTriggers = [
    "LOGIN",
    "PROFILE_UPDATE",
    "XP_AWARD",
    "REFERRAL_COMPLETED",
    "GENERAL",
  ];

  if (!allowedTriggers.includes(triggerType)) {
    throw new Error("Invalid achievement evaluation trigger");
  }

  if (externalSession) {
    if (!externalSession.inTransaction()) {
      throw new Error(
        "External MongoDB session must have an active transaction"
      );
    }

    return evaluateAchievementsInTransaction({
      userId,
      triggerType,
      session: externalSession,
    });
  }

  const session = await mongoose.startSession();

  try {
    let results = [];

    await session.withTransaction(async () => {
      results = await evaluateAchievementsInTransaction({
        userId,
        triggerType,
        session,
      });
    });

    return results;
  } finally {
    await session.endSession();
  }
};

export default evaluateAchievements;
