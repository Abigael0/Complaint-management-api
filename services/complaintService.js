const allowedTransitions = {
  PENDING: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  REJECTED: [],
  CLOSED: [],
};

const changeComplaintStatus = async (complaint, newStatus, changedBy, note) => {
  const currentStatus = complaint.status;

  const allowedNextStatuses = allowedTransitions[currentStatus] || [];

  if (!allowedNextStatuses.includes(newStatus)) {
    const error = new Error(
      `Cannot change complaint status from ${currentStatus} to ${newStatus}`,
    );

    error.statusCode = 400;

    throw error;
  }

  complaint.status = newStatus;

  complaint.statusHistory.push({
    status: newStatus,
    changedBy,
    note,
  });

  await complaint.save();

  return complaint;
};

module.exports = {
  allowedTransitions,
  changeComplaintStatus,
};
