
import express from "express";

import {
  changeUserStatus,
} from "../controllers/admin-user-status.controller.js";

import {
  authenticateAdmin,
} from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Update a user's account status (Protected Admin Route)
router.patch(
  "/:userId/status",
  authenticateAdmin,
  changeUserStatus
);

export default router;
