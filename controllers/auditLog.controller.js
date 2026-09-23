const AuditLog = require("../models/auditLog.model.js");

const Complaint = require("../models/complaint.model.js");

const getComplaintHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const user = req.user;

    const isAdmin = user.role === "ADMIN";

    const isOwner = complaint.submittedBy.toString() === user._id.toString();

    const isAssignedHandler =
      complaint.assignedTo &&
      complaint.assignedTo.toString() === user._id.toString();

    if (!isAdmin && !isOwner && !isAssignedHandler) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this complaint history",
      });
    }

    const history = await AuditLog.find({
      complaint: complaint._id,
    })
      .populate("user", "firstName lastName email role")
      .sort({
        createdAt: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Get complaint history error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while retrieving complaint history",
    });
  }
};

module.exports = {
  getComplaintHistory,
};