
import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
      immutable: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.000001,
    },

    currencyType: {
      type: String,
      required: true,
      enum: ["VE", "SVE", "GEMS", "TOKENS"],
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
      default: "PENDING",
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    walletTransactionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WalletTransaction",
      },
    ],

    statusHistory: [
      {
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
          required: true,
        },

        changedBy: {
          type: String,
          default: null,
        },

        reason: {
          type: String,
          trim: true,
          maxlength: 500,
          default: null,
        },

        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

withdrawalSchema.index({ userId: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;
