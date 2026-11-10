
import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
      immutable: true,
    },

    currencyType: {
      type: String,
      required: true,
      enum: ["VE", "SVE", "GEMS", "TOKENS"],
    },

    availableBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    reservedBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One wallet per user for each currency type
walletSchema.index(
  { userId: 1, currencyType: 1 },
  { unique: true }
);

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;
