
import {
  registerUser,
  loginUser,
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
    next(error);
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
    next(error);
  }
};
