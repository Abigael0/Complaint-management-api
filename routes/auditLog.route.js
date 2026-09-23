const express = require("express");

const {
  getComplaintHistory,
} = require("../controllers/auditLog.controller.js");

const protect = require("../middleware/auth.middleware.js");

const router = express.Router();

router.get("/complaints/:id/history", protect, getComplaintHistory);

module.exports = router;
