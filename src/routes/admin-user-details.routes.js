import express from "express";

import {
  getUserDetailsById,
} from "../controllers/admin-user-details.controller.js";

import {
  authenticateAdmin,
} from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Get specific user details (Protected Admin Route)
router.get("/:userId", authenticateAdmin, getUserDetailsById);

export default router;