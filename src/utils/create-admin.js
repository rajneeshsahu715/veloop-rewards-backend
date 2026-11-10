
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import AdminUser from "../models/AdminUser.js";

dotenv.config();

const createAdmin = async () => {
  try {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error(
        "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env"
      );
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("Admin password must be at least 12 characters long");
    }

    await connectDB();

    const email = ADMIN_EMAIL.trim().toLowerCase();

    const existingAdmin = await AdminUser.findOne({ email });

    if (existingAdmin) {
      console.log("Admin account already exists. No changes made.");
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await AdminUser.create({
      name: ADMIN_NAME.trim(),
      email,
      passwordHash,
      role: "SUPER_ADMIN",
    });

    console.log("Super Admin account created successfully.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  }
};

createAdmin();
