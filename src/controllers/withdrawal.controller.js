
import {
  createWithdrawalRequest,
  getUserWithdrawalHistory,
  getUserWithdrawalDetails,
} from "../services/withdrawal.service.js";

// Submit withdrawal request
export const requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, currencyType } = req.body;

    const result = await createWithdrawalRequest({
      userId: req.auth.userId,
      amount,
      currencyType,
    });

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      data: {
        withdrawal: result,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get authenticated user's withdrawal history
export const getUserWithdrawals = async (req, res, next) => {
  try {
    const result = await getUserWithdrawalHistory({
      userId: req.auth.userId,
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 10,
      status: req.query.status,
      currencyType: req.query.currencyType,
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal history fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get individual withdrawal details
export const getWithdrawalDetails = async (req, res, next) => {
  try {
    const result = await getUserWithdrawalDetails({
      userId: req.auth.userId,
      withdrawalId: req.params.withdrawalId,
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal details fetched successfully",
      data: {
        withdrawal: result,
      },
    });
  } catch (error) {
    next(error);
  }
};
