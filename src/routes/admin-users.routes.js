import express from "express";

import { getUsers } from "../controllers/admin-users.controller.js";

import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Get all users (Protected Admin Route)
router.get("/", authenticateAdmin, getUsers);

export default router;