import { adjustUserWallet } from "../services/admin-wallet.service.js";

export const adjustWallet = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const {
      currencyType,
      transactionType,
      amount,
      description,
    } = req.body;

    const result = await adjustUserWallet({
      userId,
      currencyType,
      transactionType,
      amount,
      description,
      adminId: req.admin.adminId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Wallet ${transactionType.toLowerCase()} successful`,
      data: {
        transaction: result,
      },
    });
  } catch (error) {
    next(error);
  }
};