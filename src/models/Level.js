
import mongoose from "mongoose";

const levelSchema = new mongoose.Schema(
  {
    levelNumber: {
      type: Number,
      required: true,
      min: 1,
      unique: true,
    },

    levelName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    xpThreshold: {
      type: Number,
      required: true,
      min: 0,
    },

    displayOrder: {
      type: Number,
      required: true,
      min: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    unlockConditions: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    badgeReference: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

levelSchema.index({ displayOrder: 1 });

const Level = mongoose.model("Level", levelSchema);

export default Level;
