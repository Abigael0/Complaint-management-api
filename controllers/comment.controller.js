const Comment = require("../models/comment.model.js");
const Complaint = require("../models/complaint.model.js");

const { createAuditLog } = require("../services/auditLogService.js");

const createComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment message is required",
      });
    }

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
        message: "You are not authorized to comment on this complaint",
      });
    }

    const attachments = (req.files || []).map((file) => ({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname,
      fileType: file.mimetype,
    }));

    const comment = await Comment.create({
      complaint: complaint._id,
      user: user._id,
      message: message.trim(),
      attachments,
    });

    await createAuditLog({
      complaint: complaint._id,
      user: user._id,
      action: "COMMENTED",
      description: `${user.firstName} ${user.lastName} added a comment`,
    });

    await comment.populate("user", "firstName lastName email role");

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getComplaintComments = async (req, res) => {
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
        message: "You are not authorized to view these comments",
      });
    }

    const comments = await Comment.find({
      complaint: complaint._id,
    })
      .populate("user", "firstName lastName email role")
      .sort({
        createdAt: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  createComment,
  getComplaintComments,
};
