const Complaint = require("../models/complaint.model.js");

const getHandlerDashboard = async (req, res) => {
  try {
    const handlerId = req.user._id;

    const [
      totalAssigned,
      assigned,
      inProgress,
      resolved,
      recentAssignments,
      urgentComplaints,
    ] = await Promise.all([
      Complaint.countDocuments({
        assignedTo: handlerId,
      }),

      Complaint.countDocuments({
        assignedTo: handlerId,
        status: "ASSIGNED",
      }),

      Complaint.countDocuments({
        assignedTo: handlerId,
        status: "IN_PROGRESS",
      }),

      Complaint.countDocuments({
        assignedTo: handlerId,
        status: "RESOLVED",
      }),

      Complaint.find({
        assignedTo: handlerId,
      })
        .populate("submittedBy", "firstName lastName email")
        .sort({
          assignedAt: -1,
        })
        .limit(10)
        .lean(),

      Complaint.find({
        assignedTo: handlerId,
        priority: {
          $in: ["HIGH", "URGENT"],
        },
        status: {
          $in: ["ASSIGNED", "IN_PROGRESS"],
        },
      })
        .populate("submittedBy", "firstName lastName email")
        .sort({
          priority: -1,
          createdAt: 1,
        })
        .limit(10)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,

      statistics: {
        totalAssigned,
        assigned,
        inProgress,
        resolved,
      },

      recentAssignments,

      urgentComplaints,
    });
  } catch (error) {
    console.error("Get handler dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while retrieving handler dashboard",
    });
  }
};

module.exports = {
  getHandlerDashboard,
};
