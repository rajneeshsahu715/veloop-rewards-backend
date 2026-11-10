
import {
  getUserWallets,
  getUserWalletTransactions,
} from "../services/user-wallet.service.js";

export const fetchUserWallets = async (req, res, next) => {
  try {
    const wallets = await getUserWallets(req.auth.userId);

    return res.status(200).json({
      success: true,
      message: "Wallets fetched successfully",
      data: {
        wallets,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const fetchUserWalletTransactions = async (req, res, next) => {
  try {
    const result = await getUserWalletTransactions({
      userId: req.auth.userId,
      page: req.query.page ?? 1,
      limit: req.query.limit ?? 10,
      currencyType: req.query.currencyType,
      transactionType: req.query.transactionType,
    });

    return res.status(200).json({
      success: true,
      message: "Wallet transactions fetched successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
