import express from "express";

import { getDashboardStats } from "../controllers/admin-dashboard.controller.js";

import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Protected Admin Dashboard API
router.get("/", authenticateAdmin, getDashboardStats);

export default router;