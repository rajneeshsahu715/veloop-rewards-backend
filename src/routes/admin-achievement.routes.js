
import express from "express";

import {
  getAchievements,
  getAchievement,
  createNewAchievement,
  updateExistingAchievement,
} from "../controllers/admin-achievement.controller.js";

import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

router.use(authenticateAdmin);

router.get("/", getAchievements);

router.get("/:achievementId", getAchievement);

router.post("/", createNewAchievement);

router.patch("/:achievementId", updateExistingAchievement);

export default router;
