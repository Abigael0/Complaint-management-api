const AuditLog = require("../models/auditLog.model.js");

const createAuditLog = async ({
  complaint,
  user,
  action,
  oldStatus = null,
  newStatus = null,
  description,
}) => {
  return AuditLog.create({
    complaint,
    user,
    action,
    oldStatus,
    newStatus,
    description,
  });
};

module.exports = {
  createAuditLog,
};
