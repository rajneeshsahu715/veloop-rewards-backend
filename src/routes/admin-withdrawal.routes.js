import express from "express";

import {
  getWithdrawals,
  changeWithdrawalStatus,
} from "../controllers/admin-withdrawal.controller.js";

import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Get all withdrawal requests
router.get("/", authenticateAdmin, getWithdrawals);

// Approve, reject, or complete a withdrawal
router.patch("/:withdrawalId/status", authenticateAdmin, changeWithdrawalStatus);

export default router;