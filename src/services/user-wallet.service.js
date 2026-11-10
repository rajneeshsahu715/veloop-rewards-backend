
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";

const ALLOWED_CURRENCIES = ["VE", "SVE", "GEMS", "TOKENS"];
const ALLOWED_TRANSACTION_TYPES = ["CREDIT", "DEBIT"];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Get all wallets belonging to the authenticated user
export const getUserWallets = async (userId) => {
  if (!userId || typeof userId !== "string") {
    throw createError("Valid user ID is required");
  }

  const wallets = await Wallet.find({ userId })
    .select("currencyType availableBalance reservedBalance createdAt updatedAt")
    .sort({ currencyType: 1 })
    .lean();

  return wallets;
};

// Get paginated transaction history of the authenticated user
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

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  if (
    !Number.isInteger(parsedPage) ||
    parsedPage < 1
  ) {
    throw createError("Page must be a positive integer");
  }

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 100
  ) {
    throw createError("Limit must be between 1 and 100");
  }

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
