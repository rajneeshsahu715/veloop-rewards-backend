import { randomBytes } from "node:crypto";
import User from "../models/User.js";

export const generateUniqueReferralCode = async ({
  session,
  maxAttempts = 10,
} = {}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const referralCode =
      `VL${randomBytes(5).toString("hex").toUpperCase()}`;

    let query = User.exists({ referralCode });

    if (session) {
      query = query.session(session);
    }

    const existingUser = await query;

    if (!existingUser) {
      return referralCode;
    }
  }

  throw new Error(
    "Unable to generate a unique referral code. Please try again."
  );
};
