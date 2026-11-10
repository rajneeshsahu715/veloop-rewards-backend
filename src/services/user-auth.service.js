import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import UserLevel from "../models/UserLevel.js";
import Referral from "../models/Referral.js";

import {
  generateUniqueReferralCode,
} from "./referral-code.service.js";

import {
  evaluateAchievements,
} from "./achievement-progress.service.js";

const BCRYPT_SALT_ROUNDS = 12;
const MAX_PASSWORD_BYTES = 72;

const WALLET_CURRENCIES = [
  "VE",
  "SVE",
  "GEMS",
  "TOKENS",
];

const createAuthError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateUserAuthConfig = () => {
  if (!process.env.USER_JWT_SECRET) {
    throw createAuthError(
      "User authentication configuration error",
      500
    );
  }
};

const generateUserToken = (user) => {
  validateUserAuthConfig();

  return jwt.sign(
    {
      userId: user.userId,
      role: "USER",
    },
    process.env.USER_JWT_SECRET,
    {
      expiresIn: process.env.USER_JWT_EXPIRES_IN || "1h",
      issuer: "veloop-user-auth",
      audience: "veloop-user",
    }
  );
};

const getSafeUserData = (user) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
  referralCode: user.referralCode,
  accountStatus: user.accountStatus,
  createdAt: user.createdAt,
});

export const registerUser = async ({
  name,
  email,
  password,
  referralCode,
} = {}) => {
  const normalizedName =
    typeof name === "string" ? name.trim() : "";

  const normalizedEmail =
    typeof email === "string"
      ? email.trim().toLowerCase()
      : "";

  if (!normalizedName || !normalizedEmail || !password) {
    throw createAuthError(
      "Name, email and password are required"
    );
  }

  if (normalizedName.length > 100) {
    throw createAuthError(
      "Name cannot exceed 100 characters"
    );
  }

  if (normalizedEmail.length > 254) {
    throw createAuthError(
      "Email cannot exceed 254 characters"
    );
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw createAuthError(
      "Please provide a valid email address"
    );
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
  ) {
    throw createAuthError(
      "Password must contain at least 8 characters and cannot exceed 72 UTF-8 bytes"
    );
  }

  let normalizedReferralCode = "";

  if (referralCode !== undefined && referralCode !== null) {
    if (typeof referralCode !== "string") {
      throw createAuthError("Invalid referral code");
    }

    normalizedReferralCode = referralCode.trim().toUpperCase();

    if (normalizedReferralCode.length > 50) {
      throw createAuthError("Invalid referral code");
    }
  }

  validateUserAuthConfig();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  }).select("_id");

  if (existingUser) {
    throw createAuthError(
      "An account with this email already exists",
      409
    );
  }

  const passwordHash = await bcrypt.hash(
    password,
    BCRYPT_SALT_ROUNDS
  );

  const session = await mongoose.startSession();

  let registrationResult;

  try {
    await session.withTransaction(async () => {
      let referrer = null;

      if (normalizedReferralCode) {
        referrer = await User.findOne({
          referralCode: normalizedReferralCode,
        })
          .select("userId accountStatus")
          .session(session);

        if (!referrer) {
          throw createAuthError("Invalid referral code");
        }

        if (referrer.accountStatus !== "ACTIVE") {
          throw createAuthError(
            "The referral code owner account is not active",
            403
          );
        }
      }

      const newReferralCode =
        await generateUniqueReferralCode({ session });

      const users = await User.create(
        [
          {
            name: normalizedName,
            email: normalizedEmail,
            passwordHash,
            referralCode: newReferralCode,
          },
        ],
        {
          session,
          ordered: true,
        }
      );

      const user = users[0];

      const walletDocuments = WALLET_CURRENCIES.map(
        (currencyType) => ({
          userId: user.userId,
          currencyType,
          availableBalance: 0,
          reservedBalance: 0,
        })
      );

      await Wallet.create(walletDocuments, {
        session,
        ordered: true,
      });

      await UserLevel.create(
        [
          {
            userId: user.userId,
            totalXP: 0,
            currentLevelId: null,
          },
        ],
        {
          session,
          ordered: true,
        }
      );

      if (referrer) {
        await Referral.create(
          [
            {
              referrerUserId: referrer.userId,
              referredUserId: user.userId,
              referralCode: normalizedReferralCode,
              status: "PENDING",
            },
          ],
          {
            session,
            ordered: true,
          }
        );
      }

      const token = generateUserToken(user);

      registrationResult = {
        user: getSafeUserData(user),
        token,
      };
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createAuthError(
        "An account with this email or referral code already exists",
        409
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  return registrationResult;
};

export const loginUser = async ({
  email,
  password,
} = {}) => {
  const normalizedEmail =
    typeof email === "string"
      ? email.trim().toLowerCase()
      : "";

  if (
    !normalizedEmail ||
    typeof password !== "string" ||
    !password
  ) {
    throw createAuthError(
      "Email and password are required"
    );
  }

  if (normalizedEmail.length > 254) {
    throw createAuthError(
      "Invalid email or password",
      401
    );
  }

  validateUserAuthConfig();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+passwordHash");

  if (!user) {
    throw createAuthError(
      "Invalid email or password",
      401
    );
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw createAuthError(
      "Invalid email or password",
      401
    );
  }

  if (user.accountStatus !== "ACTIVE") {
    throw createAuthError(
      "Your account is not active",
      403
    );
  }

  const token = generateUserToken(user);

  // Achievement failure should not block a valid login.
  try {
    await evaluateAchievements({
      userId: user.userId,
      triggerType: "LOGIN",
    });
  } catch (error) {
    console.error(
      "Login achievement evaluation failed:",
      error.message
    );
  }

  return {
    user: getSafeUserData(user),
    token,
  };
};
