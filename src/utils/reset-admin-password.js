
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import AdminUser from "../models/AdminUser.js";
import mongoose from "mongoose";

dotenv.config();

const resetAdminPassword = async () => {
  try {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env"
      );
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("Password must contain at least 12 characters");
    }

    await connectDB();

    const email = ADMIN_EMAIL.trim().toLowerCase();

    const admin = await AdminUser.findOne({ email });

    if (!admin) {
      throw new Error("Admin account not found");
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    admin.passwordHash = passwordHash;
    await admin.save();

    console.log("Admin password updated successfully.");
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

resetAdminPassword();
