import { getAllUsers } from "../services/admin-users.service.js";

export const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
    } = req.query;

    const result = await getAllUsers({
      page,
      limit,
      search,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};