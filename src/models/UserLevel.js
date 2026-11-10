import mongoose from "mongoose";

const userLevelSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
      unique: true,
      immutable: true,
    },

    totalXP: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    currentLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Level",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const UserLevel = mongoose.model("UserLevel", userLevelSchema);

export default UserLevel;