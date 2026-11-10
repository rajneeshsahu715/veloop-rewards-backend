
import mongoose from "mongoose";

import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Withdrawal from "../models/Withdrawal.js";
import WalletTransaction from "../models/WalletTransaction.js";
import ActivityLog from "../models/ActivityLog.js";

const ALLOWED_CURRENCIES = ["VE", "SVE", "GEMS", "TOKENS"];

const ALLOWED_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

// Create a withdrawal request
export const createWithdrawalRequest = async ({
  userId,
  amount,
  currencyType,
}) => {
  if (!userId || typeof userId !== "string") {
    createError("Valid user ID is required");
  }

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    createError("Withdrawal amount must be positive");
  }

  if (!ALLOWED_CURRENCIES.includes(currencyType)) {
    createError("Invalid wallet currency type");
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ userId }).session(session);

      if (!user) {
        createError("User not found", 404);
      }

      if (user.accountStatus !== "ACTIVE") {
        createError("Withdrawal is not allowed for inactive users", 403);
      }

      const wallet = await Wallet.findOne({
        userId,
        currencyType,
      }).session(session);

      if (!wallet || wallet.availableBalance < amount) {
        createError("Insufficient wallet balance");
      }

      const previousAvailableBalance = wallet.availableBalance;
      const previousReservedBalance = wallet.reservedBalance;

      wallet.availableBalance -= amount;
      wallet.reservedBalance += amount;

      await wallet.save({ session });

      const [withdrawal] = await Withdrawal.create(
        [{
          userId,
          amount,
          currencyType,
          status: "PENDING",
          statusHistory: [{
            status: "PENDING",
            changedBy: userId,
            reason: "Withdrawal request submitted",
          }],
        }],
        { session }
      );

      const [transaction] = await WalletTransaction.create(
        [{
          userId,
          walletId: wallet._id,
          currencyType,
          transactionType: "DEBIT",
          amount,
          description: "Amount reserved for withdrawal",
          referenceId: `WITHDRAWAL-${withdrawal._id}`,
        }],
        { session }
      );

      withdrawal.walletTransactionIds.push(transaction._id);
      await withdrawal.save({ session });

      await ActivityLog.create(
        [{
          userId,
          activityType: "WITHDRAWAL_REQUEST",
          description: "Withdrawal request submitted",
          amount,
          currencyType,
          status: "PENDING",
          referenceId: String(withdrawal._id),
        }],
        { session }
      );

      result = {
        withdrawalId: withdrawal._id,
        userId,
        amount,
        currencyType,
        status: withdrawal.status,
        wallet: {
          previousAvailableBalance,
          availableBalance: wallet.availableBalance,
          previousReservedBalance,
          reservedBalance: wallet.reservedBalance,
        },
      };
    });
  } finally {
    await session.endSession();
  }

  return result;
};

// Get authenticated user's withdrawal history
export const getUserWithdrawalHistory = async ({
  userId,
  page = 1,
  limit = 10,
  status,
  currencyType,
}) => {
  if (!userId || typeof userId !== "string") {
    createError("Valid user ID is required");
  }

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    createError("Page must be a positive integer");
  }

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 100
  ) {
    createError("Limit must be between 1 and 100");
  }

  const filter = { userId };

  if (status !== undefined && status !== "") {
    if (!ALLOWED_STATUSES.includes(status)) {
      createError("Invalid withdrawal status filter");
    }

    filter.status = status;
  }

  if (currencyType !== undefined && currencyType !== "") {
    if (!ALLOWED_CURRENCIES.includes(currencyType)) {
      createError("Invalid wallet currency type");
    }

    filter.currencyType = currencyType;
  }

  const skip = (parsedPage - 1) * parsedLimit;

  const [withdrawals, totalWithdrawals] = await Promise.all([
    Withdrawal.find(filter)
      .select(
        "amount currencyType status rejectionReason statusHistory createdAt updatedAt"
      )
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),

    Withdrawal.countDocuments(filter),
  ]);

  return {
    withdrawals,
    pagination: {
      currentPage: parsedPage,
      limit: parsedLimit,
      totalWithdrawals,
      totalPages: Math.ceil(totalWithdrawals / parsedLimit),
      hasNextPage: parsedPage * parsedLimit < totalWithdrawals,
      hasPreviousPage: parsedPage > 1,
    },
  };
};

// Get individual withdrawal details for authenticated user
export const getUserWithdrawalDetails = async ({
  userId,
  withdrawalId,
}) => {
  if (!userId || typeof userId !== "string") {
    createError("Valid user ID is required");
  }

  if (!mongoose.isValidObjectId(withdrawalId)) {
    createError("Invalid withdrawal ID");
  }

  const withdrawal = await Withdrawal.findOne({
    _id: withdrawalId,
    userId,
  })
    .select(
      "amount currencyType status rejectionReason statusHistory createdAt updatedAt"
    )
    .lean();

  if (!withdrawal) {
    createError("Withdrawal request not found", 404);
  }

  return withdrawal;
};
