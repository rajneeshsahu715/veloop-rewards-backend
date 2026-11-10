import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      required: true,
      default: () => randomUUID(),
      immutable: true,
    },

    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    profileImage: {
      type: String,
      default: null,
    },

    profileImagePublicId: {
      type: String,
      default: null,
    },

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },

    accountStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DEACTIVATED"],
      default: "ACTIVE",
    },

    emailVerified: {
      type: Boolean,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
