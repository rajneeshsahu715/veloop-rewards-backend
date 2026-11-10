import { getUserProfile } from "../services/profile.service.js";
import { updateUserProfile } from "../services/profile-update.service.js";

export const getMyProfile = async (req, res, next) => {
    try {
        const authenticatedUserId = req.auth?.userId;

        const profile = await getUserProfile(authenticatedUserId);

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: profile,
        });
    } catch (error) {
        next(error);
    }
};

export const updateMyProfile = async (req, res, next) => {
    try {
        const authenticatedUserId = req.auth?.userId;

        const updatedProfile = await updateUserProfile(
            authenticatedUserId,
            req.body,
            req.file || null
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
};
