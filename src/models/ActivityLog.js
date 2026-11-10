
import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
      immutable: true,
    },

    activityType: {
      type: String,
      required: true,
      enum: [
        "REWARD_CREDIT",
        "XP_CREDIT",
        "DAILY_BONUS",
        "GEM_REWARD",
        "REFERRAL_REWARD",
        "WITHDRAWAL_REQUEST",
        "WITHDRAWAL_COMPLETED",
      ],
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    amount: {
      type: Number,
      default: null,
      min: 0,
    },

    currencyType: {
      type: String,
      enum: ["VE", "SVE", "GEMS", "TOKENS", "XP"],
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REJECTED"],
      default: null,
    },

    referenceId: {
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

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ activityType: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
