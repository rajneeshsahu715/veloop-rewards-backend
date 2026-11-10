
import express from "express";

import { authenticateUser } from "../middleware/auth.middleware.js";

import {
  fetchUserWallets,
  fetchUserWalletTransactions,
} from "../controllers/user-wallet.controller.js";

const router = express.Router();

// All wallet routes require user authentication
router.use(authenticateUser);

// GET /api/wallets
router.get("/", fetchUserWallets);

// GET /api/wallets/transactions
router.get("/transactions", fetchUserWalletTransactions);

export default router;
