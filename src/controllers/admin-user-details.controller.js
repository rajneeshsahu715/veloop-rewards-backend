import { getUserDetails } from "../services/admin-user-details.service.js";

export const getUserDetailsById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await getUserDetails(userId);

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
