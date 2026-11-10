import mongoose from "mongoose";

const xpTransactionSchema = new mongoose.Schema(
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
        "DAILY_LOGIN",
        "PROFILE_COMPLETION",
        "REFERRAL_REWARD",
        "ACHIEVEMENT_UNLOCK",
        "DAILY_BONUS",
      ],
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    referenceId: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

xpTransactionSchema.index(
  {
    userId: 1,
    activityType: 1,
    referenceId: 1,
  },
  {
    unique: true,
  }
);

xpTransactionSchema.index({
  userId: 1,
  createdAt: -1,
});

const XPTransaction = mongoose.model(
  "XPTransaction",
  xpTransactionSchema
);

export default XPTransaction;
