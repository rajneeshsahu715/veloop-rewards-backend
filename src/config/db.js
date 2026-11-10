
import mongoose from "mongoose";
import dns from "node:dns";

// Use reliable public DNS resolvers
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 15000,
      }
    );

    console.log(
      `MongoDB Connected: ${connection.connection.host}`
    );

    return connection;
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    throw error;
  }
};

export default connectDB;
