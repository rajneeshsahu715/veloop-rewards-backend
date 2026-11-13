import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  adminLogin,
  getAdminProfile,
  adminLogout,
} from "../controllers/admin-auth.controller.js";

import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Admin login protection: 5 unsuccessful attempts per 15 minutes.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many admin login attempts. Please try again later.",
  },
});

// Public login with rate limiting.
router.post("/login", adminLoginLimiter, adminLogin);

// Protected admin profile.
router.get("/me", authenticateAdmin, getAdminProfile);

// Protected admin logout.
router.post("/logout", authenticateAdmin, adminLogout);

export default router;
