import { getAdminDashboard } from "../services/admin-dashboard.service.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const dashboard = await getAdminDashboard();

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data fetched successfully",
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};