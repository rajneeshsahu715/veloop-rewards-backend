import mongoose from "mongoose";

import Referral from "../models/Referral.js";

import { awardXP } from "./xp-reward.service.js";
import { evaluateAchievements } from "./achievement-progress.service.js";

export const completeReferralForUser = async (referredUserId) => {
    if (
        typeof referredUserId !== "string" ||
        !referredUserId.trim()
    ) {
        throw new Error("Valid referred user ID is required");
    }

    const session = await mongoose.startSession();

    try {
        let result = {
            completed: false,
            message: "No pending referral found",
        };

        await session.withTransaction(async () => {
            const referral = await Referral.findOne({
                referredUserId: referredUserId.trim(),
                status: "PENDING",
            }).session(session);

            if (!referral) {
                result = {
                    completed: false,
                    message: "No pending referral found",
                };

                return;
            }

            const statusUpdate = await Referral.updateOne(
                {
                    _id: referral._id,
                    status: "PENDING",
                },
                {
                    $set: {
                        status: "COMPLETED",
                    },
                },
                {
                    session,
                    runValidators: true,
                }
            );

            if (statusUpdate.modifiedCount !== 1) {
                result = {
                    completed: false,
                    message: "Referral was already processed",
                };

                return;
            }

            const xpResult = await awardXP({
                userId: referral.referrerUserId,
                activityType: "REFERRAL_REWARD",
                referenceId: referral._id.toString(),
                session,
            });

            await evaluateAchievements({
                userId: referral.referrerUserId,
                triggerType: "REFERRAL_COMPLETED",
                session,
            });

            result = {
                completed: true,
                referralId: referral._id.toString(),
                referrerUserId: referral.referrerUserId,
                xpAwarded: xpResult.amount || 0,
                duplicateReward: Boolean(xpResult.duplicate),
                message: "Referral completed successfully",
            };
        });

        return result;
    } finally {
        await session.endSession();
    }
};

export default completeReferralForUser;
