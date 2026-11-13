import mongoose from "mongoose";

import Achievement from "../models/Achievement.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

const ALLOWED_ACHIEVEMENT_FIELDS = [
  "achievementName",
  "description",
  "unlockConditions",
  "badgeReference",
  "isActive",
];

const ALLOWED_CONDITION_TYPES = [
  "FIRST_LOGIN",
  "PROFILE_COMPLETION",
  "TOTAL_XP",
  "SUCCESSFUL_REFERRALS",
];

const ACHIEVEMENT_NAME_COLLATION = {
  locale: "en",
  strength: 2,
};

const createAchievementError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeDatabaseError = (error) => {
  if (error?.code === 11000) {
    return createAchievementError(
      "Achievement name already exists",
      409
    );
  }

  if (error?.name === "ValidationError") {
    return createAchievementError(
      "Invalid achievement data",
      400
    );
  }

  if (error?.name === "CastError") {
    return createAchievementError(
      "Invalid achievement data",
      400
    );
  }

  return error;
};

const validateAdminId = (adminId) => {
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    throw createAchievementError("Invalid admin ID");
  }
};

const validateUnlockConditions = (conditions) => {
  if (
    !conditions ||
    typeof conditions !== "object" ||
    Array.isArray(conditions)
  ) {
    throw createAchievementError("Invalid unlock conditions");
  }

  const fields = Object.keys(conditions);

  if (
    fields.length !== 2 ||
    !fields.includes("type") ||
    !fields.includes("target")
  ) {
    throw createAchievementError(
      "Unlock conditions must contain only type and target"
    );
  }

  if (
    typeof conditions.type !== "string" ||
    !ALLOWED_CONDITION_TYPES.includes(conditions.type)
  ) {
    throw createAchievementError(
      "Unsupported achievement condition type"
    );
  }

  if (
    typeof conditions.target !== "number" ||
    !Number.isSafeInteger(conditions.target) ||
    conditions.target <= 0
  ) {
    throw createAchievementError(
      "Achievement target must be a positive integer"
    );
  }

  if (
    conditions.type === "FIRST_LOGIN" &&
    conditions.target !== 1
  ) {
    throw createAchievementError(
      "FIRST_LOGIN target must be exactly 1"
    );
  }

  if (
    conditions.type === "PROFILE_COMPLETION" &&
    conditions.target !== 100
  ) {
    throw createAchievementError(
      "PROFILE_COMPLETION target must be exactly 100"
    );
  }
};

const validateAchievementData = (data, isUpdate = false) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createAchievementError("Invalid achievement data");
  }

  const fields = Object.keys(data);

  if (
    fields.some(
      (field) => !ALLOWED_ACHIEVEMENT_FIELDS.includes(field)
    )
  ) {
    throw createAchievementError("Unsupported achievement field");
  }

  if (!isUpdate) {
    const requiredFields = [
      "achievementName",
      "description",
      "unlockConditions",
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw createAchievementError(`${field} is required`);
      }
    }
  }

  if (data.achievementName !== undefined) {
    if (
      typeof data.achievementName !== "string" ||
      !data.achievementName.trim() ||
      data.achievementName.trim().length > 100
    ) {
      throw createAchievementError(
        "Achievement name must be between 1 and 100 characters"
      );
    }
  }

  if (data.description !== undefined) {
    if (
      typeof data.description !== "string" ||
      !data.description.trim() ||
      data.description.trim().length > 500
    ) {
      throw createAchievementError(
        "Description must be between 1 and 500 characters"
      );
    }
  }

  if (data.unlockConditions !== undefined) {
    validateUnlockConditions(data.unlockConditions);
  }

  if (
    data.badgeReference !== undefined &&
    data.badgeReference !== null &&
    typeof data.badgeReference !== "string"
  ) {
    throw createAchievementError(
      "Badge reference must be a string or null"
    );
  }

  if (
    data.isActive !== undefined &&
    typeof data.isActive !== "boolean"
  ) {
    throw createAchievementError("isActive must be a boolean");
  }
};

const getAllAchievements = async ({
  includeInactive = true,
} = {}) => {
  const filter = {};

  if (!includeInactive) {
    filter.isActive = true;
  }

  return Achievement.find(filter)
    .sort({ createdAt: -1 })
    .lean();
};

const getAchievementById = async (achievementId) => {
  if (!mongoose.Types.ObjectId.isValid(achievementId)) {
    throw createAchievementError("Invalid achievement ID");
  }

  const achievement = await Achievement.findById(
    achievementId
  ).lean();

  if (!achievement) {
    throw createAchievementError("Achievement not found", 404);
  }

  return achievement;
};

const createAchievement = async ({
  data,
  adminId,
  ipAddress = null,
}) => {
  validateAdminId(adminId);
  validateAchievementData(data);

  const session = await mongoose.startSession();
  let createdAchievement;

  try {
    await session.withTransaction(async () => {
      const achievementName = data.achievementName.trim();

      const existingAchievement = await Achievement.findOne({
        achievementName,
      })
        .collation(ACHIEVEMENT_NAME_COLLATION)
        .session(session);

      if (existingAchievement) {
        throw createAchievementError(
          "Achievement name already exists",
          409
        );
      }

      const [achievement] = await Achievement.create(
        [
          {
            achievementName,
            description: data.description.trim(),
            unlockConditions: data.unlockConditions,
            badgeReference:
              data.badgeReference?.trim() || null,
            isActive: data.isActive ?? true,
          },
        ],
        { session }
      );

      await AdminAuditLog.create(
        [
          {
            adminId,
            action: "ACHIEVEMENT_CREATED",
            targetType: "ACHIEVEMENT",
            targetId: achievement._id.toString(),
            details: {
              achievementName: achievement.achievementName,
              description: achievement.description,
              unlockConditions: achievement.unlockConditions,
              isActive: achievement.isActive,
            },
            ipAddress,
          },
        ],
        { session }
      );

      createdAchievement = achievement;
    });

    return createdAchievement;
  } catch (error) {
    throw normalizeDatabaseError(error);
  } finally {
    await session.endSession();
  }
};

const updateAchievement = async ({
  achievementId,
  data,
  adminId,
  ipAddress = null,
}) => {
  validateAdminId(adminId);

  if (!mongoose.Types.ObjectId.isValid(achievementId)) {
    throw createAchievementError("Invalid achievement ID");
  }

  validateAchievementData(data, true);

  if (Object.keys(data).length === 0) {
    throw createAchievementError(
      "At least one field is required for update"
    );
  }

  const session = await mongoose.startSession();
  let updatedAchievement;

  try {
    await session.withTransaction(async () => {
      const achievement = await Achievement.findById(
        achievementId
      ).session(session);

      if (!achievement) {
        throw createAchievementError(
          "Achievement not found",
          404
        );
      }

      const previousValues = {};

      for (const [key, value] of Object.entries(data)) {
        previousValues[key] = achievement[key];

        if (key === "achievementName") {
          const normalizedName = value.trim();

          const duplicate = await Achievement.findOne({
            achievementName: normalizedName,
            _id: { $ne: achievementId },
          })
            .collation(ACHIEVEMENT_NAME_COLLATION)
            .session(session);

          if (duplicate) {
            throw createAchievementError(
              "Achievement name already exists",
              409
            );
          }

          achievement[key] = normalizedName;
        } else if (key === "description") {
          achievement[key] = value.trim();
        } else if (key === "badgeReference") {
          achievement[key] = value?.trim() || null;
        } else {
          achievement[key] = value;
        }
      }

      await achievement.save({ session });

      const updatedValues = {};

      for (const key of Object.keys(data)) {
        updatedValues[key] = achievement[key];
      }

      await AdminAuditLog.create(
        [
          {
            adminId,
            action: "ACHIEVEMENT_UPDATED",
            targetType: "ACHIEVEMENT",
            targetId: achievement._id.toString(),
            details: {
              previousValues,
              updatedValues,
            },
            ipAddress,
          },
        ],
        { session }
      );

      updatedAchievement = achievement;
    });

    return updatedAchievement;
  } catch (error) {
    throw normalizeDatabaseError(error);
  } finally {
    await session.endSession();
  }
};

export {
  getAllAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
};
