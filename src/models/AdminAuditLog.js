import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      immutable: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    targetType: {
      type: String,
      required: true,
      enum: [
        "USER",
        "WALLET",
        "WITHDRAWAL",
        "LEVEL",
        "ACHIEVEMENT",
        "REFERRAL",
        "SYSTEM",
      ],
    },

    targetId: {
      type: String,
      default: null,
      trim: true,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1 });

const AdminAuditLog = mongoose.model(
  "AdminAuditLog",
  adminAuditLogSchema
);

export default AdminAuditLog;