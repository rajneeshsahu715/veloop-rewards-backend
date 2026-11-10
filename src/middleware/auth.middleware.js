
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is missing.",
    });
  }

  const userJwtSecret = process.env.USER_JWT_SECRET;

  if (!userJwtSecret) {
    return res.status(500).json({
      success: false,
      message: "User authentication configuration error.",
    });
  }

  let decoded;

  // Step 1: Verify JWT
  try {
    decoded = jwt.verify(token, userJwtSecret, {
      issuer: "veloop-user-auth",
      audience: "veloop-user",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Authentication token has expired. Please log in again."
          : "Invalid authentication token.",
    });
  }

  // Step 2: Validate token payload
  if (
    typeof decoded.userId !== "string" ||
    !decoded.userId.trim() ||
    decoded.role !== "USER"
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid user authentication token.",
    });
  }

  // Step 3: Verify user from database
  try {
    const user = await User.findOne({
      userId: decoded.userId,
    }).select("userId accountStatus");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found. Please log in again.",
      });
    }

    if (user.accountStatus !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    // Step 4: Attach authenticated user
    req.auth = {
      userId: user.userId,
      role: "USER",
    };

    return next();

  } catch (error) {
    return next(error);
  }
};
