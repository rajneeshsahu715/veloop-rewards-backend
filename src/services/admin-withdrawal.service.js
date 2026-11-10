import mongoose from "mongoose";

import Withdrawal from "../models/Withdrawal.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import ActivityLog from "../models/ActivityLog.js";

const ALLOWED_ACTIONS = ["APPROVED", "REJECTED", "COMPLETED"];

// Get withdrawal requests with pagination and optional status filter
export const getAllWithdrawals = async ({
  page = 1,
  limit = 10,
  status = "",
} = {}) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 10));

  const filter = {};

  if (status) {
    const allowedStatuses = [
      "PENDING",
      "APPROVED",
      "REJECTED",
      "COMPLETED",
    ];

    if (!allowedStatuses.includes(status)) {
      const error = new Error("Invalid withdrawal status filter");
      error.statusCode = 400;
      throw error;
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
    const error = new Error("Valid withdrawal ID is required");
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_ACTIONS.includes(status)) {
    const error = new Error("Invalid withdrawal action");
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.isValidObjectId(adminId)) {
    const error = new Error("Valid admin ID is required");
    error.statusCode = 401;
    throw error;
  }

  if (status === "REJECTED" && (!reason || !reason.trim())) {
    const error = new Error("Rejection reason is required");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const withdrawal = await Withdrawal.findById(withdrawalId).session(
        session
      );

      if (!withdrawal) {
        const error = new Error("Withdrawal request not found");
        error.statusCode = 404;
        throw error;
      }

      const previousStatus = withdrawal.status;

      const validTransition =
        (previousStatus === "PENDING" &&
          ["APPROVED", "REJECTED"].includes(status)) ||
        (previousStatus === "APPROVED" && status === "COMPLETED");

      if (!validTransition) {
        const error = new Error(
          `Cannot change withdrawal from ${previousStatus} to ${status}`
        );
        error.statusCode = 400;
        throw error;
      }

      const wallet = await Wallet.findOne({
        userId: withdrawal.userId,
        currencyType: withdrawal.currencyType,
      }).session(session);

      if (!wallet) {
        const error = new Error("Associated wallet not found");
        error.statusCode = 404;
        throw error;
      }

      if (wallet.reservedBalance < withdrawal.amount) {
        const error = new Error("Insufficient reserved wallet balance");
        error.statusCode = 409;
        throw error;
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

        withdrawal.walletTransactionIds.push(refundTransaction._id);
        withdrawal.rejectionReason = reason.trim();

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
                reason: reason.trim(),
                previousStatus,
                newStatus: status,
                previousAvailableBalance,
                newAvailableBalance: wallet.availableBalance,
              },
              ipAddress: ipAddress || null,
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
              ipAddress: ipAddress || null,
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
              },
              ipAddress: ipAddress || null,
            },
          ],
          { session }
        );
      }

      withdrawal.status = status;

      withdrawal.statusHistory.push({
        status,
        changedBy: adminId,
        reason: reason?.trim() || null,
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