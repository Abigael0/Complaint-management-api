const bcrypt = require("bcryptjs");

const User = require("../models/user.model.js");
const generateToken = require("../utils/generateToken.js");
const AppError = require("../utils/app-error.js");

const sendOTPEmail = require("../services/emailService.js");


const toPublicUser = (user) => {
  const publicUser = user.toObject();
  delete publicUser.password;
  return publicUser;
};

const register = async (req, res, next) => {
  try {
    const { firstName, lastName, userName, email, password } = req.body;

    if (!firstName || !lastName || !userName || !email || !password) {
      throw new AppError("All fields are required", 400);
    }

    if (
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 20
    ) {
      throw new AppError("Password must be between 6 and 20 characters", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUserName = userName.trim().toLowerCase();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { userName: normalizedUserName }],
    });

    if (existingUser) {
      throw new AppError("User with this email or username already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      userName: normalizedUserName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email and password are required", 400);
    }

    if (
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 20
    ) {
      throw new AppError(
        "Password must be between 6 and 20 characters",
        400
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    const nameParts = trimmedName.split(/\s+/);

    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Generate a username from the name
    const baseUserName = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    let userName = baseUserName;
    let counter = 1;

    while (await User.findOne({ userName })) {
      userName = `${baseUserName}${counter}`;
      counter++;
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new AppError("A user with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      userName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "ADMIN",
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Admin registration successful",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};




const login = async (req, res, next) => {
  try {
    const { email, userName, password } = req.body;
    const loginIdentifier = email || userName;

    if (!loginIdentifier || !password) {
      throw new AppError("Email or username and password are required", 400);
    }

    const normalizedIdentifier = loginIdentifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { userName: normalizedIdentifier }],
    }).select("+password");

    if (!user) {
      throw new AppError("User not found, Please Register", 404);
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated", 403);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};


const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      throw new AppError("No account found with this email", 404);
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    

    // OTP expires in 10 minutes
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;

    await user.save();

    await sendOTPEmail(user.email, otp);

    return res.status(200).json({
      message: "Verification code sent to your email",
    });
  } catch (error) {
    return next(error);
  }
};


const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError("Email and verification code are required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.resetPasswordOTP) {
      throw new AppError("No verification code found", 400);
    }

    if (
      !user.resetPasswordOTPExpires ||
      user.resetPasswordOTPExpires < new Date()
    ) {
      throw new AppError("Verification code has expired", 400);
    }

    if (user.resetPasswordOTP !== otp) {
      throw new AppError("Invalid verification code", 400);
    }

    return res.status(200).json({
      message: "Verification code is valid",
    });
  } catch (error) {
    return next(error);
  }
};


const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new AppError(
        "Email, verification code and new password are required",
        400
      );
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 6 ||
      newPassword.length > 20
    ) {
      throw new AppError(
        "Password must be between 6 and 20 characters",
        400
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.resetPasswordOTP) {
      throw new AppError("No verification code found", 400);
    }

    if (
      !user.resetPasswordOTPExpires ||
      user.resetPasswordOTPExpires < new Date()
    ) {
      throw new AppError("Verification code has expired", 400);
    }

    if (user.resetPasswordOTP !== otp) {
      throw new AppError("Invalid verification code", 400);
    }

    user.password = await bcrypt.hash(newPassword, 10);

    // Clear OTP after successful password reset
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;

    await user.save();

    return res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    return next(error);
  }
};


module.exports = {
  register,
  registerAdmin,
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};
