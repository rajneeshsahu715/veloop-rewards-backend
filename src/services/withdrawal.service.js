
import mongoose from "mongoose";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Withdrawal from "../models/Withdrawal.js";
import WalletTransaction from "../models/WalletTransaction.js";
import ActivityLog from "../models/ActivityLog.js";

const ALLOWED_CURRENCIES = ["VE", "SVE", "GEMS", "TOKENS"];
const ALLOWED_STATUSES = ["PENDING", "APPROVED", "REJECTED", "COMPLETED"];

const MAX_PAGE = 10000;
const MAX_LIMIT = 100;

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePaginationValue = (value, fieldName, min, max) => {
  const isValidType =
    typeof value === "string" || typeof value === "number";

  if (!isValidType) {
    throw createError(`Invalid ${fieldName}`);
  }

  const stringValue = String(value);

  if (!/^\d+$/.test(stringValue)) {
    throw createError(`Invalid ${fieldName}`);
  }

  const parsedValue = Number(stringValue);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < min ||
    parsedValue > max
  ) {
    throw createError(
      fieldName === "page"
        ? `Page must be between 1 and ${MAX_PAGE}`
        : `Limit must be between 1 and ${MAX_LIMIT}`
    );
  }

  return parsedValue;
};

export const createWithdrawalRequest = async ({
  userId,
  amount,
  currencyType,
}) => {
  if (!userId || typeof userId !== "string") {
    throw createError("Valid user ID is required");
  }

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw createError("Withdrawal amount must be positive");
  }

  if (!ALLOWED_CURRENCIES.includes(currencyType)) {
    throw createError("Invalid wallet currency type");
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ userId }).session(session);

      if (!user) {
        throw createError("User not found", 404);
      }

      if (user.accountStatus !== "ACTIVE") {
        throw createError(
          "Withdrawal is not allowed for inactive users",
          403
        );
      }

      const wallet = await Wallet.findOne({
        userId,
        currencyType,
      }).session(session);

      if (!wallet || wallet.availableBalance < amount) {
        throw createError("Insufficient wallet balance");
      }

      const previousAvailableBalance = wallet.availableBalance;
      const previousReservedBalance = wallet.reservedBalance;

      wallet.availableBalance -= amount;
      wallet.reservedBalance += amount;

      await wallet.save({ session });

      const [withdrawal] = await Withdrawal.create(
        [
          {
            userId,
            amount,
            currencyType,
            status: "PENDING",
            statusHistory: [
              {
                status: "PENDING",
                changedBy: userId,
                reason: "Withdrawal request submitted",
              },
            ],
          },
        ],
        { session }
      );

      const [transaction] = await WalletTransaction.create(
        [
          {
            userId,
            walletId: wallet._id,
            currencyType,
            transactionType: "DEBIT",
            amount,
            description: "Amount reserved for withdrawal",
            referenceId: `WITHDRAWAL-${withdrawal._id}`,
          },
        ],
        { session }
      );

      withdrawal.walletTransactionIds.push(transaction._id);
      await withdrawal.save({ session });

      await ActivityLog.create(
        [
          {
            userId,
            activityType: "WITHDRAWAL_REQUEST",
            description: "Withdrawal request submitted",
            amount,
            currencyType,
            status: "PENDING",
            referenceId: String(withdrawal._id),
          },
        ],
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

export const getUserWithdrawalHistory = async ({
  userId,
  page = 1,
  limit = 10,
  status,
  currencyType,
}) => {
  if (!userId || typeof userId !== "string") {
    throw createError("Valid user ID is required");
  }

  const parsedPage = parsePaginationValue(
    page,
    "page",
    1,
    MAX_PAGE
  );

  const parsedLimit = parsePaginationValue(
    limit,
    "limit",
    1,
    MAX_LIMIT
  );

  const filter = { userId };

  if (status !== undefined && status !== "") {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw createError("Invalid withdrawal status filter");
    }

    filter.status = status;
  }

  if (currencyType !== undefined && currencyType !== "") {
    if (!ALLOWED_CURRENCIES.includes(currencyType)) {
      throw createError("Invalid wallet currency type");
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

export const getUserWithdrawalDetails = async ({
  userId,
  withdrawalId,
}) => {
  if (!userId || typeof userId !== "string") {
    throw createError("Valid user ID is required");
  }

  if (!mongoose.isValidObjectId(withdrawalId)) {
    throw createError("Invalid withdrawal ID");
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
    throw createError("Withdrawal request not found", 404);
  }

  return withdrawal;
};
