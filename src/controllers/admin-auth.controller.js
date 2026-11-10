import { loginAdmin } from "../services/admin-auth.service.js";

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginAdmin(email, password);

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get authenticated admin profile
export const getAdminProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin profile fetched successfully",
    data: {
      admin: req.admin,
    },
  });
};