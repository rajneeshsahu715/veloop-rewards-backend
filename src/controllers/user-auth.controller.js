import {
  registerUser,
  loginUser,
  logoutUser,
} from "../services/user-auth.service.js";

export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    return res.status(200).json({
      success: true,
      message: "User login successful",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await logoutUser(
      req.auth.userId,
      req.auth.tokenVersion
    );

    return res.status(200).json({
      success: true,
      message: "User logout successful",
    });
  } catch (error) {
    return next(error);
  }
};
