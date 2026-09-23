const Complaint = require("../models/complaint.model.js");
const { changeComplaintStatus } = require("../services/complaintService.js");
const { createAuditLog } = require("../services/auditLogService.js");
const { canTransition } = require("../utils/complainStatus.js");

const getHandlerComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, category } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);

    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const skip = (pageNumber - 1) * limitNumber;

    const filter = {
      assignedTo: req.user._id,
    };

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (priority) {
      filter.priority = priority.toUpperCase();
    }

    if (category) {
      filter.category = category.toUpperCase();
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate("submittedBy", "firstName lastName email")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Complaint.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    return res.status(200).json({
      complaints,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Get handler complaints error:", error);

    return res.status(500).json({
      message: "Server error while retrieving handler complaints",
    });
  }
};

const getHandlerComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      complaintId: req.params.id,
      assignedTo: req.user._id,
    })
      .populate("submittedBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email role")
      .populate("statusHistory.changedBy", "firstName lastName role");

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    return res.status(200).json({
      complaint,
    });
  } catch (error) {
    console.error("Get handler complaint error:", error);

    return res.status(500).json({
      message: "Server error while retrieving complaint",
    });
  }
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    const newStatus = status.toUpperCase();

    if (newStatus !== "IN_PROGRESS") {
      return res.status(400).json({
        message: "Handler can only change status to IN_PROGRESS",
      });
    }

    const complaint = await Complaint.findOne({
      complaintId: req.params.id,
      assignedTo: req.user._id,
    });

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    if (!canTransition(complaint.status, "IN_PROGRESS")) {
      return res.status(400).json({
        success: false,
        message: `Cannot change complaint status from ${complaint.status} to IN_PROGRESS`,
      });
    }

    complaint.startedAt = new Date();

    await changeComplaintStatus(
      complaint,
      "IN_PROGRESS",
      req.user._id,
      "Handler started working on the complaint",
    );

    await createAuditLog({
      complaint: complaint._id,
      user: req.user._id,
      action: "STARTED",
      oldStatus: "ASSIGNED",
      newStatus: "IN_PROGRESS",
      description: "Handler started working on complaint",
    });

    return res.status(200).json({
      message: "Complaint status updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Update complaint status error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Server error while updating complaint status",
    });
  }
};

const resolveComplaint = async (req, res) => {
  try {
    const { resolution } = req.body;

    if (!resolution || !resolution.trim()) {
      return res.status(400).json({
        message: "Resolution is required",
      });
    }

    const complaint = await Complaint.findOne({
      complaintId: req.params.id,
      assignedTo: req.user._id,
    });

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "IN_PROGRESS") {
      return res.status(400).json({
        message: "Only complaints in progress can be resolved",
      });
    }

    if (!canTransition(complaint.status, "RESOLVED")) {
      return res.status(400).json({
        success: false,
        message: `Cannot change complaint status from ${complaint.status} to RESOLVED`,
      });
    }

    complaint.resolution = resolution.trim();
    complaint.resolvedAt = new Date();

    await changeComplaintStatus(
      complaint,
      "RESOLVED",
      req.user._id,
      resolution.trim(),
    );

    await createAuditLog({
      complaint: complaint._id,
      user: req.user._id,
      action: "RESOLVED",
      oldStatus: "IN_PROGRESS",
      newStatus: "RESOLVED",
      description: "Handler resolved complaint",
    });

    return res.status(200).json({
      message: "Complaint resolved successfully",
      complaint,
    });
  } catch (error) {
    console.error("Resolve complaint error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Server error while resolving complaint",
    });
  }
};

module.exports = {
  getHandlerComplaints,
  getHandlerComplaint,
  updateComplaintStatus,
  resolveComplaint,
};
