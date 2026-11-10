
import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
      immutable: true,
    },

    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      immutable: true,
    },

    currencyType: {
      type: String,
      required: true,
      enum: ["VE", "SVE", "GEMS", "TOKENS"],
      immutable: true,
    },

    transactionType: {
      type: String,
      required: true,
      enum: ["CREDIT", "DEBIT"],
    },

    amount: {
      type: Number,
      required: true,
      min: 0.000001,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
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

walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

export default WalletTransaction;
