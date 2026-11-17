
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";

const ALLOWED_CURRENCIES = ["VE", "SVE", "GEMS", "TOKENS"];
const ALLOWED_TRANSACTION_TYPES = ["CREDIT", "DEBIT"];

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

export const getUserWallets = async (userId) => {
  if (!userId || typeof userId !== "string") {
    throw createError("Valid user ID is required");
  }

  const wallets = await Wallet.find({ userId })
    .select(
      "currencyType availableBalance reservedBalance createdAt updatedAt"
    )
    .sort({ currencyType: 1 })
    .lean();

  return wallets;
};

export const getUserWalletTransactions = async ({
  userId,
  page = 1,
  limit = 10,
  currencyType,
  transactionType,
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

  if (currencyType !== undefined) {
    if (!ALLOWED_CURRENCIES.includes(currencyType)) {
      throw createError("Invalid wallet currency type");
    }

    filter.currencyType = currencyType;
  }

  if (transactionType !== undefined) {
    if (!ALLOWED_TRANSACTION_TYPES.includes(transactionType)) {
      throw createError("Invalid transaction type");
    }

    filter.transactionType = transactionType;
  }

  const skip = (parsedPage - 1) * parsedLimit;

  const [transactions, totalTransactions] = await Promise.all([
    WalletTransaction.find(filter)
      .select(
        "walletId currencyType transactionType amount description referenceId createdAt"
      )
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),

    WalletTransaction.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: {
      currentPage: parsedPage,
      limit: parsedLimit,
      totalTransactions,
      totalPages: Math.ceil(totalTransactions / parsedLimit),
      hasNextPage: parsedPage * parsedLimit < totalTransactions,
      hasPreviousPage: parsedPage > 1,
    },
  };
};
