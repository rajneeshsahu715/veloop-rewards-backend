
import {
  getAdminAuditLogs,
} from "../services/admin-audit.service.js";

const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      targetType = "",
      action = "",
      adminId = "",
    } = req.query;

    const result = await getAdminAuditLogs({
      page,
      limit,
      targetType,
      action,
      adminId,
    });

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export { getAuditLogs };
