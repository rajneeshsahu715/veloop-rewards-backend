
import express from "express";

import {
  getReferrals,
  getReferralDetails,
} from "../controllers/admin-referral.controller.js";

import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(authenticateAdmin);

router.get("/", getReferrals);

router.get("/:referralId", getReferralDetails);

export default router;
