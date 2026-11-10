
import {
  updateUserStatus,
} from "../services/admin-user-status.service.js";

export const changeUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    const updatedUser = await updateUserStatus({
      userId,
      status,
      reason,
      adminId: req.admin.adminId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "User account status updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};
