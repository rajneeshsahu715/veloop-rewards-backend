
import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrerUserId: {
      type: String,
      required: true,
      ref: "User",
      immutable: true,
    },

    referredUserId: {
      type: String,
      required: true,
      ref: "User",
      immutable: true,
    },

    referralCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

referralSchema.index(
  { referrerUserId: 1, referredUserId: 1 },
  { unique: true }
);

const Referral = mongoose.model("Referral", referralSchema);

export default Referral;
