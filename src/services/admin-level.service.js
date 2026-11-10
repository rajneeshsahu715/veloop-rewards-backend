import mongoose from "mongoose";
import Level from "../models/Level.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

const ALLOWED_LEVEL_FIELDS = [
  "levelNumber",
  "levelName",
  "xpThreshold",
  "displayOrder",
  "isActive",
  "unlockConditions",
  "badgeReference",
];

const validateAdminId = (adminId) => {
  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    throw new Error("Invalid admin ID");
  }
};

const validateLevelData = (data, isUpdate = false) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid level data");
  }

  const fields = Object.keys(data);

  if (fields.some((field) => !ALLOWED_LEVEL_FIELDS.includes(field))) {
    throw new Error("Unsupported level field");
  }

  if (!isUpdate) {
    const requiredFields = [
      "levelNumber",
      "levelName",
      "xpThreshold",
      "displayOrder",
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`${field} is required`);
      }
    }
  }

  if (data.levelNumber !== undefined) {
    if (!Number.isInteger(data.levelNumber) || data.levelNumber < 1) {
      throw new Error("Level number must be a positive integer");
    }
  }

  if (data.levelName !== undefined) {
    if (
      typeof data.levelName !== "string" ||
      !data.levelName.trim() ||
      data.levelName.trim().length > 100
    ) {
      throw new Error("Level name must be between 1 and 100 characters");
    }
  }

  if (data.xpThreshold !== undefined) {
    if (!Number.isInteger(data.xpThreshold) || data.xpThreshold < 0) {
      throw new Error("XP threshold must be a non-negative integer");
    }
  }

  if (data.displayOrder !== undefined) {
    if (!Number.isInteger(data.displayOrder) || data.displayOrder < 1) {
      throw new Error("Display order must be a positive integer");
    }
  }

  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    throw new Error("isActive must be a boolean");
  }

  if (
    data.badgeReference !== undefined &&
    data.badgeReference !== null &&
    typeof data.badgeReference !== "string"
  ) {
    throw new Error("Badge reference must be a string or null");
  }
};

const validateLevelProgression = (levels) => {
  const activeLevels = levels
    .filter((level) => level.isActive === true)
    .sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        a.levelNumber - b.levelNumber
    );

  if (activeLevels.length === 0) {
    throw new Error("At least one active level is required");
  }

  if (activeLevels[0].xpThreshold !== 0) {
    throw new Error("The first active level must start at 0 XP");
  }

  for (let index = 1; index < activeLevels.length; index++) {
    const previous = activeLevels[index - 1];
    const current = activeLevels[index];

    if (current.xpThreshold <= previous.xpThreshold) {
      throw new Error(
        "XP thresholds must strictly increase with display order"
      );
    }

    if (current.levelNumber <= previous.levelNumber) {
      throw new Error(
        "Level numbers must increase with display order"
      );
    }
  }
};

const getAllLevels = async ({ includeInactive = true } = {}) => {
  const filter = {};

  if (!includeInactive) {
    filter.isActive = true;
  }

  return Level.find(filter)
    .sort({ displayOrder: 1, levelNumber: 1 })
    .lean();
};

const getLevelById = async (levelId) => {
  if (!mongoose.Types.ObjectId.isValid(levelId)) {
    throw new Error("Invalid level ID");
  }

  const level = await Level.findById(levelId).lean();

  if (!level) {
    throw new Error("Level not found");
  }

  return level;
};

const createLevel = async ({
  data,
  adminId,
  ipAddress = null,
}) => {
  validateAdminId(adminId);
  validateLevelData(data);

  const session = await mongoose.startSession();
  let createdLevel;

  try {
    await session.withTransaction(async () => {
      const existingLevel = await Level.findOne({
        $or: [
          { levelNumber: data.levelNumber },
          { displayOrder: data.displayOrder },
        ],
      }).session(session);

      if (existingLevel) {
        throw new Error("Level number or display order already exists");
      }

      const [level] = await Level.create(
        [
          {
            levelNumber: data.levelNumber,
            levelName: data.levelName.trim(),
            xpThreshold: data.xpThreshold,
            displayOrder: data.displayOrder,
            isActive: data.isActive ?? true,
            unlockConditions: data.unlockConditions ?? null,
            badgeReference: data.badgeReference?.trim() || null,
          },
        ],
        { session }
      );

      const allLevels = await Level.find({})
        .session(session)
        .lean();

      validateLevelProgression(allLevels);

      await AdminAuditLog.create(
        [
          {
            adminId,
            action: "LEVEL_CREATED",
            targetType: "LEVEL",
            targetId: level._id.toString(),
            details: {
              levelNumber: level.levelNumber,
              levelName: level.levelName,
              xpThreshold: level.xpThreshold,
              displayOrder: level.displayOrder,
            },
            ipAddress,
          },
        ],
        { session }
      );

      createdLevel = level;
    });

    return createdLevel;
  } finally {
    await session.endSession();
  }
};

const updateLevel = async ({
  levelId,
  data,
  adminId,
  ipAddress = null,
}) => {
  validateAdminId(adminId);

  if (!mongoose.Types.ObjectId.isValid(levelId)) {
    throw new Error("Invalid level ID");
  }

  validateLevelData(data, true);

  if (Object.keys(data).length === 0) {
    throw new Error("At least one field is required for update");
  }

  const session = await mongoose.startSession();
  let updatedLevel;

  try {
    await session.withTransaction(async () => {
      const level = await Level.findById(levelId).session(session);

      if (!level) {
        throw new Error("Level not found");
      }

      const previousValues = {};

      for (const [key, value] of Object.entries(data)) {
        previousValues[key] = level[key];

        if (key === "levelNumber") {
          const duplicate = await Level.findOne({
            levelNumber: value,
            _id: { $ne: levelId },
          }).session(session);

          if (duplicate) {
            throw new Error("Level number already exists");
          }
        }

        if (key === "displayOrder") {
          const duplicate = await Level.findOne({
            displayOrder: value,
            _id: { $ne: levelId },
          }).session(session);

          if (duplicate) {
            throw new Error("Display order already exists");
          }
        }

        if (key === "levelName") {
          level[key] = value.trim();
        } else if (key === "badgeReference") {
          level[key] = value?.trim() || null;
        } else {
          level[key] = value;
        }
      }

      await level.save({ session });

      const allLevels = await Level.find({})
        .session(session)
        .lean();

      validateLevelProgression(allLevels);

      const updatedValues = {};

      for (const key of Object.keys(data)) {
        updatedValues[key] = level[key];
      }

      await AdminAuditLog.create(
        [
          {
            adminId,
            action: "LEVEL_UPDATED",
            targetType: "LEVEL",
            targetId: level._id.toString(),
            details: {
              previousValues,
              updatedValues,
            },
            ipAddress,
          },
        ],
        { session }
      );

      updatedLevel = level;
    });

    return updatedLevel;
  } finally {
    await session.endSession();
  }
};

export {
  getAllLevels,
  getLevelById,
  createLevel,
  updateLevel,
};
