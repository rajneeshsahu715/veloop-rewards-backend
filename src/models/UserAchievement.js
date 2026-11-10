
import mongoose from "mongoose";

const userAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
      immutable: true,
    },

    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Achievement",
      required: true,
      immutable: true,
    },

    unlockedAt: {
      type: Date,
      default: null,
    },

    progress: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userAchievementSchema.index(
  { userId: 1, achievementId: 1 },
  { unique: true }
);

const UserAchievement = mongoose.model(
  "UserAchievement",
  userAchievementSchema
);

export default UserAchievement;
