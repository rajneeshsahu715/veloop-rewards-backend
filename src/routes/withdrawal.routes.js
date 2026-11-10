
import express from "express";

import {
  requestWithdrawal,
  getUserWithdrawals,
  getWithdrawalDetails,
} from "../controllers/withdrawal.controller.js";

import { authenticateUser } from "../middleware/auth.middleware.js";

const router = express.Router();

// All withdrawal routes require user authentication
router.use(authenticateUser);

// Submit withdrawal request
router.post("/", requestWithdrawal);

// Get authenticated user's withdrawal history
router.get("/", getUserWithdrawals);

// Get individual withdrawal details
router.get("/:withdrawalId", getWithdrawalDetails);

export default router;
