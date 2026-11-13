import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema(
  {
    achievementName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    unlockConditions: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    badgeReference: {
      type: String,
      default: null,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Existing case-sensitive index preserved.
achievementSchema.index({ achievementName: 1 });

// Database-level case-insensitive unique index.
achievementSchema.index(
  { achievementName: 1 },
  {
    unique: true,
    name: "achievementName_ci_unique",
    collation: {
      locale: "en",
      strength: 2,
    },
  }
);

// Existing active-status index preserved.
achievementSchema.index({ isActive: 1 });

const Achievement = mongoose.model(
  "Achievement",
  achievementSchema
);

export default Achievement;
