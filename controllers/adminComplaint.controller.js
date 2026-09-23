const Complaint = require("../models/complaint.model.js");
const User = require("../models/user.model.js");
const { changeComplaintStatus } = require("../services/complaintService.js");
const { createAuditLog } = require("../services/auditLogService.js");

const getAllComplaints = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      category,
      assignedTo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    if (Number.isNaN(page) || page < 1) {
      page = 1;
    }

    if (Number.isNaN(limit) || limit < 1) {
      limit = 10;
    }

    if (page < 1) {
      page = 1;
    }

    if (limit < 1) {
      limit = 10;
    }

    if (limit > 100) {
      limit = 100;
    }

    const skip = (page - 1) * limit;

    const filter = {};

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (priority) {
      filter.priority = priority.toUpperCase();
    }

    if (category) {
      filter.category = category.toUpperCase();
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (search) {
      filter.$or = [
        {
          complaintId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    let sort;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    if (sortBy === "priority") {
      sort = {
        priority: sortDirection,
      };
    } else {
      sort = {
        [sortBy]: sortDirection,
      };
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate("submittedBy", "firstName lastName email")
        .populate("assignedTo", "firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      Complaint.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,

      data: complaints,

      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get all complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while retrieving complaints",
    });
  }
};

const getAdminComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      complaintId: req.params.id,
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
    console.error("Get admin complaint error:", error);

    return res.status(500).json({
      message: "Server error while retrieving complaint",
    });
  }
};

const assignComplaint = async (req, res) => {
  try {
    const { handlerId } = req.body;

    if (!handlerId) {
      return res.status(400).json({
        message: "handlerId is required",
      });
    }

    const handler = await User.findById(handlerId);

    if (!handler) {
      return res.status(404).json({
        message: "Handler not found",
      });
    }

    if (handler.role !== "HANDLER") {
      return res.status(400).json({
        message: "Complaint can only be assigned to a HANDLER",
      });
    }

    const complaint = await Complaint.findOne({
      complaintId: req.params.id,
    });

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "PENDING") {
      return res.status(400).json({
        message: "Only pending complaints can be assigned",
      });
    }

    const oldStatus = complaint.status;

    complaint.assignedTo = handler._id;
    complaint.assignedAt = new Date();

    await changeComplaintStatus(
      complaint,
      "ASSIGNED",
      req.user._id,
      `Complaint assigned to ${handler.firstName} ${handler.lastName}`,
    );

    await complaint.save();

    await complaint.populate("assignedTo", "firstName lastName email role");

    await createAuditLog({
      complaint: complaint._id,
      user: req.user._id,
      action: "ASSIGNED",
      oldStatus,
      newStatus: complaint.status,
      description: `Complaint assigned to ${handler.firstName} ${handler.lastName}`,
    });

    return res.status(200).json({
      message: "Complaint assigned successfully",
      complaint,
    });
  } catch (error) {
    console.error("Assign complaint error:", error);

    return res.status(500).json({
      message: "Server error while assigning complaint",
    });
  }
};

const rejectComplaint = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const complaint = await Complaint.findOne({
      complaintId: req.params.id,
    });

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "PENDING") {
      return res.status(400).json({
        message: "Only pending complaints can be rejected",
      });
    }

    const oldStatus = complaint.status;

    complaint.rejectionReason = reason.trim();

    await changeComplaintStatus(
      complaint,
      "REJECTED",
      req.user._id,
      reason.trim(),
    );

    await createAuditLog({
      complaint: complaint._id,
      user: req.user._id,
      action: "REJECTED",
      oldStatus,
      newStatus: "REJECTED",
      description: `Complaint rejected: ${reason}`,
    });

    return res.status(200).json({
      message: "Complaint rejected successfully",
      complaint,
    });
  } catch (error) {
    console.error("Reject complaint error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Server error while rejecting complaint",
    });
  }
};

module.exports = {
  getAllComplaints,
  getAdminComplaint,
  assignComplaint,
  rejectComplaint,
};
