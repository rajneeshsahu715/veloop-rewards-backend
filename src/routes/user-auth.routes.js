
import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  register,
  login,
} from "../controllers/user-auth.controller.js";

const router = express.Router();

// Registration rate limiter
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

// Login rate limiter
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

// User registration
router.post("/register", registrationLimiter, register);

// User login
router.post("/login", loginLimiter, login);

export default router;
