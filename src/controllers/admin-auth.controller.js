import {
  loginAdmin,
  logoutAdmin,
} from "../services/admin-auth.service.js";

export const adminLogin = async (req, res, next) => {
  try {
    const body = req.body;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      const error = new Error("Invalid login request body");
      error.statusCode = 400;
      throw error;
    }

    const result = await loginAdmin(
      body.email,
      body.password,
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin profile fetched successfully",
    data: {
      admin: req.admin,
    },
  });
};

// Logout authenticated admin and revoke existing tokens.
export const adminLogout = async (req, res, next) => {
  try {
    await logoutAdmin(
      req.admin.adminId,
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: "Admin logout successful",
    });
  } catch (error) {
    return next(error);
  }
};
