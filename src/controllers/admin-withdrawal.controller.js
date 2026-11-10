import {
  getAllWithdrawals,
  updateWithdrawalStatus,
} from "../services/admin-withdrawal.service.js";

// Get all withdrawal requests
export const getWithdrawals = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;

    const result = await getAllWithdrawals({
      page,
      limit,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal requests fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Approve, reject, or complete withdrawal
export const changeWithdrawalStatus = async (req, res, next) => {
  try {
    const { withdrawalId } = req.params;
    const { status, reason } = req.body;

    const result = await updateWithdrawalStatus({
      withdrawalId,
      status,
      reason,
      adminId: req.admin.adminId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Withdrawal ${status.toLowerCase()} successfully`,
      data: {
        withdrawal: result,
      },
    });
  } catch (error) {
    next(error);
  }
};