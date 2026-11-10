import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import connectDB from "./config/db.js";

// User Routes
import userAuthRoutes from "./routes/user-auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import withdrawalRoutes from "./routes/withdrawal.routes.js";
import userWalletRoutes from "./routes/user-wallet.routes.js";

// Admin Routes
import adminAuthRoutes from "./routes/admin-auth.routes.js";
import adminDashboardRoutes from "./routes/admin-dashboard.routes.js";
import adminUsersRoutes from "./routes/admin-users.routes.js";
import adminUserDetailsRoutes from "./routes/admin-user-details.routes.js";
import adminUserStatusRoutes from "./routes/admin-user-status.routes.js";
import adminWalletRoutes from "./routes/admin-wallet.routes.js";
import adminWithdrawalRoutes from "./routes/admin-withdrawal.routes.js";
import adminLevelRoutes from "./routes/admin-level.routes.js";
import adminAuditRoutes from "./routes/admin-audit.routes.js";
import adminAchievementRoutes from "./routes/admin-achievement.routes.js";
import adminReferralRoutes from "./routes/admin-referral.routes.js";

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet());

app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
        credentials: true,
    })
);

// Request Parsing and Logging
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Health Check
app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "VELoop Backend is running successfully!",
    });
});

// User Authentication Routes
app.use("/api/auth", userAuthRoutes);

// User Routes
app.use("/api/profile", profileRoutes);
app.use("/api/wallets", userWalletRoutes);
app.use("/api/withdrawals", withdrawalRoutes);

// Admin Routes
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/user-details", adminUserDetailsRoutes);
app.use("/api/admin/users", adminUserStatusRoutes);
app.use("/api/admin/wallet", adminWalletRoutes);
app.use("/api/admin/withdrawals", adminWithdrawalRoutes);
app.use("/api/admin/levels", adminLevelRoutes);
app.use("/api/admin/audit-logs", adminAuditRoutes);
app.use("/api/admin/achievements", adminAchievementRoutes);
app.use("/api/admin/referrals", adminReferralRoutes);

// 404 Handler
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "API route not found",
    });
});

// Global Error Handler
app.use((error, req, res, next) => {
    console.error("Server Error:", error.message);

    let statusCode = 500;
    let message = "Internal Server Error";

    if (error.name === "MulterError") {
        statusCode = 400;

        if (error.code === "LIMIT_FILE_SIZE") {
            message = "Image size cannot exceed 5 MB";
        } else if (error.code === "LIMIT_FILE_COUNT") {
            message = "Only one image can be uploaded at a time";
        } else {
            message = "Image upload failed";
        }
    } else if (
        error.message === "Only JPG, PNG and WEBP images are allowed"
    ) {
        statusCode = 400;
        message = error.message;
    } else if (
        Number.isInteger(error.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode < 500
    ) {
        statusCode = error.statusCode;
        message = error.message || "Request failed";
    }

    return res.status(statusCode).json({
        success: false,
        message,
    });
});

// Start Server
const startServer = async () => {
    try {
        await connectDB();

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`VELoop Backend running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
