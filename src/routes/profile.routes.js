import express from "express";

import {
    getMyProfile,
    updateMyProfile,
} from "../controllers/profile.controller.js";

import { authenticateUser } from "../middleware/auth.middleware.js";
import uploadProfileImage from "../middleware/upload.middleware.js";

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
    updateMyProfile
);

export default router;
