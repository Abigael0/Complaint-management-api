const bcrypt = require("bcryptjs");

const User = require("../models/user.model.js");
const generateToken = require("../utils/generateToken.js");
const AppError = require("../utils/app-error.js");

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

module.exports = {
  register,
  registerAdmin,
  login,
};
