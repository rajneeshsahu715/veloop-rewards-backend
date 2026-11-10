
import mongoose from "mongoose";
import dotenv from "dotenv";

import connectDB from "../config/db.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import UserLevel from "../models/UserLevel.js";

dotenv.config();

const TEST_EMAIL = "veloop.test@example.com";

const CURRENCIES = ["VE", "SVE", "GEMS", "TOKENS"];

const initializeTestUser = async () => {
  let session;

  try {
    await connectDB();

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const user = await User.findOne({
        email: TEST_EMAIL,
      }).session(session);

      if (!user) {
        throw new Error("Test user not found");
      }

      if (user.accountStatus !== "ACTIVE") {
        throw new Error("Test user is not active");
      }

      const existingWallets = await Wallet.find({
        userId: user.userId,
      }).session(session);

      const existingCurrencies = existingWallets.map(
        (wallet) => wallet.currencyType
      );

      const missingCurrencies = CURRENCIES.filter(
        (currency) => !existingCurrencies.includes(currency)
      );

      if (missingCurrencies.length > 0) {
        const walletDocuments = missingCurrencies.map(
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
      }

      const existingUserLevel = await UserLevel.findOne({
        userId: user.userId,
      }).session(session);

      if (!existingUserLevel) {
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
      }

      console.log("User account initialization successful");
      console.log("User ID:", user.userId);
      console.log("Existing wallets:", existingCurrencies.length);
      console.log("New wallets:", missingCurrencies.length);
      console.log(
        "UserLevel:",
        existingUserLevel ? "Already existed" : "Created"
      );
    });
  } catch (error) {
    console.error("Initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (session) {
      await session.endSession();
    }

    await mongoose.disconnect();
  }
};

initializeTestUser();
