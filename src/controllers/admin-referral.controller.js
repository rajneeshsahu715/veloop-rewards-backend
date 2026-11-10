
import {
  getAllReferrals,
  getReferralById,
} from "../services/admin-referral.service.js";

export const getReferrals = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "",
      search = "",
    } = req.query;

    const result = await getAllReferrals({
      page,
      limit,
      status,
      search,
    });

    return res.status(200).json({
      success: true,
      message: "Referrals fetched successfully",
      data: result.referrals,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getReferralDetails = async (req, res, next) => {
  try {
    const { referralId } = req.params;

    const referral = await getReferralById(referralId);

    return res.status(200).json({
      success: true,
      message: "Referral details fetched successfully",
      data: referral,
    });
  } catch (error) {
    next(error);
  }
};
