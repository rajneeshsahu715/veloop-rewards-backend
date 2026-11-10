
import express from "express";

import { getAuditLogs } from "../controllers/admin-audit.controller.js";
import { authenticateAdmin } from "../middleware/admin-auth.middleware.js";

const router = express.Router();

// Only authenticated admins can access audit logs
router.use(authenticateAdmin);

// GET /api/admin/audit-logs
router.get("/", getAuditLogs);

export default router;
