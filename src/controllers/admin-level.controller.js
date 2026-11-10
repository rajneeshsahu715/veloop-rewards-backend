
import {
  getAllLevels,
  getLevelById,
  createLevel,
  updateLevel,
} from "../services/admin-level.service.js";

const getLevels = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive !== "false";

    const levels = await getAllLevels({ includeInactive });

    return res.status(200).json({
      success: true,
      count: levels.length,
      data: levels,
    });
  } catch (error) {
    next(error);
  }
};

const getLevel = async (req, res, next) => {
  try {
    const level = await getLevelById(req.params.levelId);

    return res.status(200).json({
      success: true,
      data: level,
    });
  } catch (error) {
    next(error);
  }
};

const addLevel = async (req, res, next) => {
  try {
    const level = await createLevel({
      data: req.body,
      adminId: req.admin.adminId,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Level created successfully",
      data: level,
    });
  } catch (error) {
    next(error);
  }
};

const editLevel = async (req, res, next) => {
  try {
    const level = await updateLevel({
      levelId: req.params.levelId,
      data: req.body,
      adminId: req.admin.adminId,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Level updated successfully",
      data: level,
    });
  } catch (error) {
    next(error);
  }
};

export {
  getLevels,
  getLevel,
  addLevel,
  editLevel,
};
