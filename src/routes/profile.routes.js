
import express from "express";

import {
  getMyProfile,
  updateMyProfile,
} from "../controllers/profile.controller.js";

import { authenticateUser } from "../middleware/auth.middleware.js";

import uploadProfileImage, {
  validateProfileImage,
} from "../middleware/upload.middleware.js";

const router = express.Router();

router.get(
  "/me",
  authenticateUser,
  getMyProfile
);

router.patch(
  "/me",
  authenticateUser,
  uploadProfileImage.single("profileImage"),
  validateProfileImage,
  updateMyProfile
);

export default router;
