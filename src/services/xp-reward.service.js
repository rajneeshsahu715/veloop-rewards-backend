import mongoose from "mongoose";

import XPTransaction from "../models/XPTransaction.js";
import UserLevel from "../models/UserLevel.js";
import Level from "../models/Level.js";
import ActivityLog from "../models/ActivityLog.js";

const XP_REWARD_RULES = {
  DAILY_LOGIN: {
    amount: 10,
    description: "Daily login XP reward",
  },
  PROFILE_COMPLETION: {
    amount: 50,
    description: "Profile completion XP reward",
  },
  REFERRAL_REWARD: {
    amount: 100,
    description: "Successful referral XP reward",
  },
  ACHIEVEMENT_UNLOCK: {
    amount: 25,
    description: "Achievement unlock XP reward",
  },
  DAILY_BONUS: {
    amount: 10,
    description: "Daily bonus XP reward",
  },
};

const getDuplicateResult = () => ({
  awarded: false,
  duplicate: true,
  message: "XP reward has already been given for this event",
});

const isDuplicateXPTransaction = (error) =>
  error?.code === 11000 &&
  error.keyPattern?.userId &&
  error.keyPattern?.activityType &&
  error.keyPattern?.referenceId;

const awardXPInTransaction = async ({
  userId,
  activityType,
  referenceId,
  session,
}) => {
  const rewardRule = XP_REWARD_RULES[activityType];

  // Check before creating to avoid unnecessary duplicate-key errors.
  const existingTransaction = await XPTransaction.findOne({
    userId,
    activityType,
    referenceId,
  }).session(session);

  if (existingTransaction) {
    return getDuplicateResult();
  }

  const userLevel = await UserLevel.findOne({
    userId,
  }).session(session);

  if (!userLevel) {
    throw new Error("User level record not found");
  }

  await XPTransaction.create(
    [
      {
        userId,
        activityType,
        amount: rewardRule.amount,
        referenceId,
        description: rewardRule.description,
      },
    ],
    { session }
  );

  const updatedUserLevel = await UserLevel.findOneAndUpdate(
    { userId },
    {
      $inc: {
        totalXP: rewardRule.amount,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    }
  );

  if (!updatedUserLevel) {
    throw new Error("Unable to update user XP");
  }

  const currentLevel = await Level.findOne({
    isActive: true,
    xpThreshold: {
      $lte: updatedUserLevel.totalXP,
    },
  })
    .sort({
      xpThreshold: -1,
      displayOrder: -1,
    })
    .session(session);

  if (!currentLevel) {
    throw new Error("No eligible active level found");
  }

  updatedUserLevel.currentLevelId = currentLevel._id;
  await updatedUserLevel.save({ session });

  await ActivityLog.create(
    [
      {
        userId,
        activityType: "XP_CREDIT",
        description: rewardRule.description,
        amount: rewardRule.amount,
        currencyType: "XP",
        status: "COMPLETED",
        referenceId,
      },
    ],
    { session }
  );

  return {
    awarded: true,
    amount: rewardRule.amount,
    totalXP: updatedUserLevel.totalXP,
    currentLevel: {
      levelNumber: currentLevel.levelNumber,
      levelName: currentLevel.levelName,
      xpThreshold: currentLevel.xpThreshold,
    },
  };
};

export const awardXP = async ({
  userId,
  activityType,
  referenceId,
  session: externalSession = null,
}) => {
  if (!userId || typeof userId !== "string") {
    throw new Error("Valid user ID is required");
  }

  if (!XP_REWARD_RULES[activityType]) {
    throw new Error("Invalid XP activity type");
  }

  if (
    !referenceId ||
    typeof referenceId !== "string" ||
    !referenceId.trim()
  ) {
    throw new Error("Valid XP reference ID is required");
  }

  const normalizedReferenceId = referenceId.trim();

  // Reuse the caller's transaction when supplied.
  if (externalSession) {
    if (!externalSession.inTransaction()) {
      throw new Error(
        "External MongoDB session must have an active transaction"
      );
    }

    return awardXPInTransaction({
      userId,
      activityType,
      referenceId: normalizedReferenceId,
      session: externalSession,
    });
  }

  // Otherwise, create and manage our own transaction.
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await awardXPInTransaction({
        userId,
        activityType,
        referenceId: normalizedReferenceId,
        session,
      });
    });

    return result;
  } catch (error) {
    if (isDuplicateXPTransaction(error)) {
      return getDuplicateResult();
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

export default awardXP;
