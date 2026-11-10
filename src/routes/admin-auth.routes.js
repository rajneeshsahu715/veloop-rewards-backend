import express from "express";

import {
  adminLogin,
  getAdminProfile,
} from "../controllers/admin-auth.controller.js";

import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Admin Login
router.post("/login", adminLogin);

// Protected Admin Profile
router.get("/me", authenticateAdmin, getAdminProfile);

export default router;