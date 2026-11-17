import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  register,
  login,
  logout,
} from "../controllers/user-auth.controller.js";

import { authenticateUser } from "../middleware/auth.middleware.js";

const router = express.Router();

// Registration: maximum 5 attempts per 15 minutes.
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

// Login: maximum 10 attempts per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

// Public routes with rate limiting.
router.post("/register", registrationLimiter, register);
router.post("/login", loginLimiter, login);

// Protected logout: revoke all active user sessions.
router.post("/logout", authenticateUser, logout);

export default router;
