
import mongoose from "mongoose";

import Withdrawal from "../models/Withdrawal.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import ActivityLog from "../models/ActivityLog.js";

const ALLOWED_ACTIONS = ["APPROVED", "REJECTED", "COMPLETED"];

const ALLOWED_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
];

const MAX_PAGE = 10000;
const MAX_LIMIT = 100;
const MAX_REASON_LENGTH = 500;
const MAX_IP_ADDRESS_LENGTH = 64;

const createValidationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePaginationValue = (value, fallback, field, maximum) => {
  if (value === undefined) {
    return fallback;
  }

  if (
    typeof value === "string" &&
    !/^\d+$/.test(value.trim())
  ) {
    throw createValidationError(`Invalid ${field}`);
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw createValidationError(`Invalid ${field}`);
  }

  const parsedValue = Number(value);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > maximum
  ) {
    throw createValidationError(`Invalid ${field}`);
  }

  return parsedValue;
};

const validateReason = (reason, status) => {
  if (reason === undefined || reason === null) {
    if (status === "REJECTED") {
      throw createValidationError("Rejection reason is required");
    }

    return null;
  }

  if (typeof reason !== "string") {
    throw createValidationError("Invalid withdrawal reason");
  }

  const normalizedReason = reason.trim();

  if (normalizedReason.length > MAX_REASON_LENGTH) {
    throw createValidationError(
      "Withdrawal reason cannot exceed 500 characters"
    );
  }

  if (status === "REJECTED" && !normalizedReason) {
    throw createValidationError("Rejection reason is required");
  }

  return normalizedReason || null;
};

const validateIpAddress = (ipAddress) => {
  if (ipAddress === undefined || ipAddress === null) {
    return null;
  }

  if (
    typeof ipAddress !== "string" ||
    ipAddress.trim().length > MAX_IP_ADDRESS_LENGTH
  ) {
    throw createValidationError("Invalid IP address");
  }

  return ipAddress.trim() || null;
};

// Get withdrawal requests with strict pagination and status filter
export const getAllWithdrawals = async ({
  page = 1,
  limit = 10,
  status = "",
} = {}) => {
  const currentPage = parsePaginationValue(
    page,
    1,
    "page",
    MAX_PAGE
  );

  const perPage = parsePaginationValue(
    limit,
    10,
    "limit",
    MAX_LIMIT
  );

  const filter = {};

  if (status !== "") {
    if (
      typeof status !== "string" ||
      !ALLOWED_STATUSES.includes(status)
    ) {
      throw createValidationError(
        "Invalid withdrawal status filter"
      );
    }

    filter.status = status;
  }

  const [withdrawals, totalWithdrawals] = await Promise.all([
    Withdrawal.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),

    Withdrawal.countDocuments(filter),
  ]);

  return {
    withdrawals,
    pagination: {
      currentPage,
      perPage,
      totalWithdrawals,
      totalPages: Math.ceil(totalWithdrawals / perPage),
    },
  };
};

// Approve, reject, or complete a withdrawal
export const updateWithdrawalStatus = async ({
  withdrawalId,
  status,
  reason,
  adminId,
  ipAddress,
}) => {
  if (!mongoose.isValidObjectId(withdrawalId)) {
    throw createValidationError(
      "Valid withdrawal ID is required"
    );
  }

  if (
    typeof status !== "string" ||
    !ALLOWED_ACTIONS.includes(status)
  ) {
    throw createValidationError("Invalid withdrawal action");
  }

  if (!mongoose.isValidObjectId(adminId)) {
    throw createValidationError(
      "Valid admin ID is required",
      401
    );
  }

  const normalizedReason = validateReason(reason, status);
  const normalizedIpAddress = validateIpAddress(ipAddress);

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const withdrawal = await Withdrawal.findById(
        withdrawalId
      ).session(session);

      if (!withdrawal) {
        throw createValidationError(
          "Withdrawal request not found",
          404
        );
      }

      const previousStatus = withdrawal.status;

      const validTransition =
        (previousStatus === "PENDING" &&
          ["APPROVED", "REJECTED"].includes(status)) ||
        (previousStatus === "APPROVED" &&
          status === "COMPLETED");

      if (!validTransition) {
        throw createValidationError(
          `Cannot change withdrawal from ${previousStatus} to ${status}`
        );
      }

      const wallet = await Wallet.findOne({
        userId: withdrawal.userId,
        currencyType: withdrawal.currencyType,
      }).session(session);

      if (!wallet) {
        throw createValidationError(
          "Associated wallet not found",
          404
        );
      }

      if (
        !Number.isFinite(wallet.reservedBalance) ||
        wallet.reservedBalance < withdrawal.amount
      ) {
        throw createValidationError(
          "Insufficient reserved wallet balance",
          409
        );
      }

      if (status === "REJECTED") {
        const previousAvailableBalance = wallet.availableBalance;

        wallet.reservedBalance -= withdrawal.amount;
        wallet.availableBalance += withdrawal.amount;

        await wallet.save({ session });

        const [refundTransaction] = await WalletTransaction.create(
          [
            {
              userId: withdrawal.userId,
              walletId: wallet._id,
              currencyType: withdrawal.currencyType,
              transactionType: "CREDIT",
              amount: withdrawal.amount,
              description: "Refund for rejected withdrawal",
              referenceId: `WITHDRAWAL-REFUND-${withdrawal._id}`,
            },
          ],
          { session }
        );

        withdrawal.walletTransactionIds.push(
          refundTransaction._id
        );

        withdrawal.rejectionReason = normalizedReason;

        await AdminAuditLog.create(
          [
            {
              adminId,
              action: "WITHDRAWAL_REJECTED",
              targetType: "WITHDRAWAL",
              targetId: String(withdrawal._id),
              details: {
                userId: withdrawal.userId,
                amount: withdrawal.amount,
                currencyType: withdrawal.currencyType,
                reason: normalizedReason,
                previousStatus,
                newStatus: status,
                previousAvailableBalance,
                newAvailableBalance: wallet.availableBalance,
              },
              ipAddress: normalizedIpAddress,
            },
          ],
          { session }
        );
      }

      if (status === "APPROVED") {
        await AdminAuditLog.create(
          [
            {
              adminId,
              action: "WITHDRAWAL_APPROVED",
              targetType: "WITHDRAWAL",
              targetId: String(withdrawal._id),
              details: {
                userId: withdrawal.userId,
                amount: withdrawal.amount,
                currencyType: withdrawal.currencyType,
                previousStatus,
                newStatus: status,
              },
              ipAddress: normalizedIpAddress,
            },
          ],
          { session }
        );
      }

      if (status === "COMPLETED") {
        wallet.reservedBalance -= withdrawal.amount;

        await wallet.save({ session });

        await ActivityLog.create(
          [
            {
              userId: withdrawal.userId,
              activityType: "WITHDRAWAL_COMPLETED",
              description: "Withdrawal completed successfully",
              amount: withdrawal.amount,
              currencyType: withdrawal.currencyType,
              status: "COMPLETED",
              referenceId: String(withdrawal._id),
            },
          ],
          { session }
        );

        await AdminAuditLog.create(
          [
            {
              adminId,
              action: "WITHDRAWAL_COMPLETED",
              targetType: "WITHDRAWAL",
              targetId: String(withdrawal._id),
              details: {
                userId: withdrawal.userId,
                amount: withdrawal.amount,
                currencyType: withdrawal.currencyType,
                previousStatus,
                newStatus: status,
                reason: normalizedReason,
              },
              ipAddress: normalizedIpAddress,
            },
          ],
          { session }
        );
      }

      withdrawal.status = status;

      withdrawal.statusHistory.push({
        status,
        changedBy: String(adminId),
        reason: normalizedReason,
      });

      await withdrawal.save({ session });

      result = {
        withdrawalId: withdrawal._id,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        currencyType: withdrawal.currencyType,
        previousStatus,
        status: withdrawal.status,
        rejectionReason: withdrawal.rejectionReason,
        wallet: {
          availableBalance: wallet.availableBalance,
          reservedBalance: wallet.reservedBalance,
        },
      };
    });
  } finally {
    await session.endSession();
  }

  return result;
};
