
import {
  getAllAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
} from "../services/admin-achievement.service.js";

const getAchievements = async (req, res, next) => {
  try {
    const includeInactive =
      req.query.includeInactive !== "false";

    const achievements = await getAllAchievements({
      includeInactive,
    });

    return res.status(200).json({
      success: true,
      count: achievements.length,
      data: achievements,
    });
  } catch (error) {
    next(error);
  }
};

const getAchievement = async (req, res, next) => {
  try {
    const achievement = await getAchievementById(
      req.params.achievementId
    );

    return res.status(200).json({
      success: true,
      data: achievement,
    });
  } catch (error) {
    next(error);
  }
};

const createNewAchievement = async (req, res, next) => {
  try {
    const achievement = await createAchievement({
      data: req.body,
      adminId: req.admin.adminId,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Achievement created successfully",
      data: achievement,
    });
  } catch (error) {
    next(error);
  }
};

const updateExistingAchievement = async (
  req,
  res,
  next
) => {
  try {
    const achievement = await updateAchievement({
      achievementId: req.params.achievementId,
      data: req.body,
      adminId: req.admin.adminId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Achievement updated successfully",
      data: achievement,
    });
  } catch (error) {
    next(error);
  }
};

export {
  getAchievements,
  getAchievement,
  createNewAchievement,
  updateExistingAchievement,
};
