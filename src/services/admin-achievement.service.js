
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

const validateAdminId = (adminId) => {
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    throw new Error("Invalid admin ID");
  }
};

const validateAchievementData = (data, isUpdate = false) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid achievement data");
  }

  const fields = Object.keys(data);

  if (
    fields.some(
      (field) => !ALLOWED_ACHIEVEMENT_FIELDS.includes(field)
    )
  ) {
    throw new Error("Unsupported achievement field");
  }

  if (!isUpdate) {
    const requiredFields = [
      "achievementName",
      "description",
      "unlockConditions",
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`${field} is required`);
      }
    }
  }

  if (data.achievementName !== undefined) {
    if (
      typeof data.achievementName !== "string" ||
      !data.achievementName.trim() ||
      data.achievementName.trim().length > 100
    ) {
      throw new Error(
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
      throw new Error(
        "Description must be between 1 and 500 characters"
      );
    }
  }

  if (data.unlockConditions !== undefined) {
    if (
      data.unlockConditions === null ||
      typeof data.unlockConditions !== "object" ||
      Array.isArray(data.unlockConditions) ||
      Object.keys(data.unlockConditions).length === 0
    ) {
      throw new Error("Invalid unlock conditions");
    }
  }

  if (
    data.badgeReference !== undefined &&
    data.badgeReference !== null &&
    typeof data.badgeReference !== "string"
  ) {
    throw new Error(
      "Badge reference must be a string or null"
    );
  }

  if (
    data.isActive !== undefined &&
    typeof data.isActive !== "boolean"
  ) {
    throw new Error("isActive must be a boolean");
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
    throw new Error("Invalid achievement ID");
  }

  const achievement = await Achievement.findById(
    achievementId
  ).lean();

  if (!achievement) {
    throw new Error("Achievement not found");
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

      const escapedName = achievementName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const existingAchievement = await Achievement.findOne({
        achievementName: {
          $regex: `^${escapedName}$`,
          $options: "i",
        },
      }).session(session);

      if (existingAchievement) {
        throw new Error("Achievement name already exists");
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
    throw new Error("Invalid achievement ID");
  }

  validateAchievementData(data, true);

  if (Object.keys(data).length === 0) {
    throw new Error("At least one field is required for update");
  }

  const session = await mongoose.startSession();
  let updatedAchievement;

  try {
    await session.withTransaction(async () => {
      const achievement = await Achievement.findById(
        achievementId
      ).session(session);

      if (!achievement) {
        throw new Error("Achievement not found");
      }

      const previousValues = {};

      for (const [key, value] of Object.entries(data)) {
        previousValues[key] = achievement[key];

        if (key === "achievementName") {
          const normalizedName = value.trim();

          const escapedName = normalizedName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

          const duplicate = await Achievement.findOne({
            achievementName: {
              $regex: `^${escapedName}$`,
              $options: "i",
            },
            _id: { $ne: achievementId },
          }).session(session);

          if (duplicate) {
            throw new Error("Achievement name already exists");
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
