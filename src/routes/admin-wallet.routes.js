import express from "express";

import { adjustWallet } from "../controllers/admin-wallet.controller.js";
import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Adjust user wallet balance
router.patch("/:userId/adjust", authenticateAdmin, adjustWallet);

export default router;