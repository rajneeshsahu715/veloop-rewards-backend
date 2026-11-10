import mongoose from "mongoose";

import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

const ALLOWED_CURRENCIES = ["VE", "SVE", "GEMS", "TOKENS"];

export const adjustUserWallet = async ({
  userId,
  currencyType,
  transactionType,
  amount,
  description,
  adminId,
  ipAddress,
}) => {
  if (!userId || typeof userId !== "string") {
    const error = new Error("Valid user ID is required");
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_CURRENCIES.includes(currencyType)) {
    const error = new Error("Invalid wallet currency type");
    error.statusCode = 400;
    throw error;
  }

  if (!["CREDIT", "DEBIT"].includes(transactionType)) {
    const error = new Error("Invalid transaction type");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    const error = new Error("Amount must be a positive number");
    error.statusCode = 400;
    throw error;
  }

  if (!description || !description.trim()) {
    const error = new Error("Transaction description is required");
    error.statusCode = 400;
    throw error;
  }

  if (!adminId || !mongoose.isValidObjectId(adminId)) {
    const error = new Error("Valid admin ID is required");
    error.statusCode = 401;
    throw error;
  }

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ userId }).session(session);

      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }

      if (user.accountStatus !== "ACTIVE") {
        const error = new Error(
          "Wallet adjustment is not allowed for inactive users"
        );
        error.statusCode = 403;
        throw error;
      }

      let wallet = await Wallet.findOne({
        userId,
        currencyType,
      }).session(session);

      if (!wallet) {
        if (transactionType === "DEBIT") {
          const error = new Error("Wallet not found or insufficient balance");
          error.statusCode = 400;
          throw error;
        }

        const [createdWallet] = await Wallet.create(
          [
            {
              userId,
              currencyType,
              availableBalance: 0,
              reservedBalance: 0,
            },
          ],
          { session }
        );

        wallet = createdWallet;
      }

      if (
        transactionType === "DEBIT" &&
        wallet.availableBalance < amount
      ) {
        const error = new Error("Insufficient wallet balance");
        error.statusCode = 400;
        throw error;
      }

      const previousBalance = wallet.availableBalance;

      if (transactionType === "CREDIT") {
        wallet.availableBalance += amount;
      } else {
        wallet.availableBalance -= amount;
      }

      await wallet.save({ session });

      const [transaction] = await WalletTransaction.create(
        [
          {
            userId,
            walletId: wallet._id,
            currencyType,
            transactionType,
            amount,
            description: description.trim(),
            referenceId: `ADMIN-${new mongoose.Types.ObjectId()}`,
          },
        ],
        { session }
      );

      await AdminAuditLog.create(
        [
          {
            adminId,
            action: `WALLET_${transactionType}`,
            targetType: "WALLET",
            targetId: String(wallet._id),
            details: {
              userId,
              currencyType,
              transactionType,
              amount,
              previousBalance,
              newBalance: wallet.availableBalance,
              description: description.trim(),
            },
            ipAddress: ipAddress || null,
          },
        ],
        { session }
      );

      result = {
        userId,
        currencyType,
        transactionType,
        amount,
        previousBalance,
        availableBalance: wallet.availableBalance,
        transactionId: transaction._id,
      };
    });
  } finally {
    await session.endSession();
  }

  return result;
};