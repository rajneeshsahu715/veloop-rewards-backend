import express from "express";

import {
  getLevels,
  getLevel,
  addLevel,
  editLevel,
} from "../controllers/admin-level.controller.js";

import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// GET all levels
router.get("/", getLevels);

// GET a single level
router.get("/:levelId", getLevel);

// CREATE a new level
router.post("/", addLevel);

// UPDATE an existing level
router.patch("/:levelId", editLevel);

export default router;