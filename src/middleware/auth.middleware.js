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

  try {
    decoded = jwt.verify(token, userJwtSecret, {
      algorithms: ["HS256"],
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

  if (
    !decoded ||
    typeof decoded.userId !== "string" ||
    !decoded.userId.trim() ||
    decoded.role !== "USER" ||
    !Number.isInteger(decoded.tokenVersion) ||
    decoded.tokenVersion < 0
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid user authentication token.",
    });
  }

  try {
    const user = await User.findOne({
      userId: decoded.userId,
    }).select("userId accountStatus tokenVersion");

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

    const currentTokenVersion = Number.isInteger(user.tokenVersion)
      ? user.tokenVersion
      : 0;

    if (decoded.tokenVersion !== currentTokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Your session is no longer valid. Please log in again.",
      });
    }

    req.auth = {
      userId: user.userId,
      role: "USER",
      tokenVersion: currentTokenVersion,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
