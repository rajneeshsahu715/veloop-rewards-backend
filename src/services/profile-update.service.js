import User from "../models/User.js";
import {
    uploadProfileImageToCloudinary,
    deleteProfileImageFromCloudinary,
} from "./cloudinary-image.service.js";
import { evaluateAchievements } from "./achievement-progress.service.js";

const createProfileError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const updateUserProfile = async (
    authenticatedUserId,
    updates,
    imageFile = null
) => {
    if (
        typeof authenticatedUserId !== "string" ||
        !authenticatedUserId.trim()
    ) {
        throw createProfileError("Authentication required", 401);
    }

    if (
        !updates ||
        typeof updates !== "object" ||
        Array.isArray(updates)
    ) {
        throw createProfileError("Invalid profile update data");
    }

    const allowedFields = ["name"];
    const receivedFields = Object.keys(updates);

    const unsupportedFields = receivedFields.filter(
        (field) => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
        throw createProfileError(
            `Unsupported profile fields: ${unsupportedFields.join(", ")}`
        );
    }

    if (receivedFields.length === 0 && !imageFile) {
        throw createProfileError(
            "At least one profile field or image is required"
        );
    }

    const changes = {};

    if (Object.hasOwn(updates, "name")) {
        if (typeof updates.name !== "string") {
            throw createProfileError("Name must be a string");
        }

        const name = updates.name.trim();

        if (!name) {
            throw createProfileError("Name cannot be empty");
        }

        if (name.length > 100) {
            throw createProfileError("Name cannot exceed 100 characters");
        }

        changes.name = name;
    }

    if (imageFile) {
        if (!imageFile.buffer || !Buffer.isBuffer(imageFile.buffer)) {
            throw createProfileError("Invalid profile image file");
        }
    }

    const user = await User.findOne({
        userId: authenticatedUserId,
    });

    if (!user) {
        throw createProfileError("User profile not found", 404);
    }

    if (user.accountStatus !== "ACTIVE") {
        throw createProfileError("Your account is not active", 403);
    }

    let uploadedImage = null;

    try {
        if (imageFile) {
            uploadedImage = await uploadProfileImageToCloudinary(
                imageFile.buffer
            );

            changes.profileImage = uploadedImage.imageUrl;
            changes.profileImagePublicId = uploadedImage.publicId;
        }

        const oldImagePublicId = user.profileImagePublicId;

        for (const [field, value] of Object.entries(changes)) {
            user[field] = value;
        }

        await user.save();

        if (
            uploadedImage &&
            oldImagePublicId &&
            oldImagePublicId !== uploadedImage.publicId
        ) {
            try {
                await deleteProfileImageFromCloudinary(oldImagePublicId);
            } catch (error) {
                console.error(
                    "Old profile image deletion failed:",
                    error.message
                );
            }
        }
    } catch (error) {
        if (uploadedImage?.publicId) {
            try {
                await deleteProfileImageFromCloudinary(
                    uploadedImage.publicId
                );
            } catch (cleanupError) {
                console.error(
                    "New profile image cleanup failed:",
                    cleanupError.message
                );
            }
        }

        throw error;
    }

    try {
        await evaluateAchievements({
            userId: user.userId,
            triggerType: "PROFILE_UPDATE",
        });
    } catch (error) {
        console.error(
            "Profile achievement evaluation failed:",
            error.message
        );
    }

    return {
        user: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,
            referralCode: user.referralCode,
            accountStatus: user.accountStatus,
            createdAt: user.createdAt,
        },
    };
};
