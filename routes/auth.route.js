const express = require("express");

const { register, login } = require("../controllers/auth.controller.js");

const protect = require("../middleware/auth.middleware.js");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.get("/me", protect, (req, res) => {
  res.status(200).json({
    user: req.user,
  });
});

module.exports = router;
