const Complaint = require("../models/complaint.model.js");
const generateComplaintId = require("../utils/generateComplaintId.js");
const { changeComplaintStatus } = require("../services/complaintService.js");
const { createAuditLog } = require("../services/auditLogService.js");
const User = require("../models/user.model.js");

const createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        message: "Title, description and category are required",
      });
    }

    const complaintId = await generateComplaintId();

    const complaint = await Complaint.create({
      complaintId,
      title,
      description,
      category: category.toUpperCase(),
      priority: priority.toUpperCase(),
      submittedBy: req.user._id,
      status: "PENDING",
      statusHistory: [
        {
          status: "PENDING",
          changedBy: req.user._id,
          note: "Complaint submitted",
        },
      ],
    });

    await createAuditLog({
      complaint: complaint._id,
      user: req.user._id,
      action: "SUBMITTED",
      newStatus: complaint.status,
      description: "Complaint submitted by user",
    });

    return res.status(201).json({
      message: "Complaint submitted successfully",
      complaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error);

    return res.status(500).json({
      message: "Server error while creating complaint",
    });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, priority } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);

    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const skip = (pageNumber - 1) * limitNumber;

    const filter = {
      submittedBy: req.user._id,
    };

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (category) {
      filter.category = category.toUpperCase();
    }

    if (priority) {
      filter.priority = priority.toUpperCase();
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 })
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
    console.error("Get my complaints error:", error);

    return res.status(500).json({
      message: "Server error while retrieving complaints",
    });
  }
};

const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      complaintId: req.params.id,
      submittedBy: req.user._id,
    })
      .populate("submittedBy", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email")
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
    console.error("Get complaint error:", error);

    return res.status(500).json({
      message: "Server error while retrieving complaint",
    });
  }
};

const closeComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      complaintId: req.params.id,
      submittedBy: req.user._id,
    });

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({
        message: "Only resolved complaints can be closed",
      });
    }

    complaint.closedAt = new Date();

    await changeComplaintStatus(
      complaint,
      "CLOSED",
      req.user._id,
      "Complaint closed by the complainant",
    );

    await createAuditLog({
      complaint: complaint._id,
      user: req.user._id,
      action: "CLOSED",
      oldStatus: "RESOLVED",
      newStatus: "CLOSED",
      description: "Complaint closed by user",
    });

    return res.status(200).json({
      message: "Complaint closed successfully",
      complaint,
    });
  } catch (error) {
    console.error("Close complaint error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode
        ? error.message
        : "Server error while closing complaint",
    });
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaint,
  closeComplaint,
};
