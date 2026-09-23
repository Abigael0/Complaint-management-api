const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "SUBMITTED",
        "ASSIGNED",
        "REASSIGNED",
        "STARTED",
        "COMMENTED",
        "RESOLVED",
        "REJECTED",
        "CLOSED",
      ],
      required: true,
    },

    oldStatus: {
      type: String,
      default: null,
    },

    newStatus: {
      type: String,
      default: null,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({
  complaint: 1,
  createdAt: 1,
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
