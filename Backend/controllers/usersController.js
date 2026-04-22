const mongoose = require("mongoose");
const User = require("../models/users");

const ALLOWED_ROLES = ["admin", "president", "officer"];
const ALLOWED_STATUSES = ["active", "inactive"];
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_POLICY_MESSAGE = "Password must be at least 8 characters long and include uppercase, lowercase, and special characters.";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || "").replace(/[^a-zA-Z\s]/g, "").trim();
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isStrongPassword(password) {
  return STRONG_PASSWORD_REGEX.test(String(password || ""));
}

function toTemporaryPassword(lastName) {
  const cleaned = normalizeName(lastName).replace(/\s+/g, "");
  if (!cleaned) {
    return "TempUser2026!";
  }

  const year = new Date().getFullYear();
  const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return `${formatted}${year}!`;
}

function toUserResponse(userDoc) {
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : userDoc;

  return {
    id: String(user._id),
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email,
    role: user.role,
    status: user.status || "active",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const listUsers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const role = normalizeRole(req.query.role);
    const status = normalizeStatus(req.query.status);

    const filter = {};

    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role && ALLOWED_ROLES.includes(role)) {
      filter.role = role;
    }

    if (status && ALLOWED_STATUSES.includes(status)) {
      filter.status = status;
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users.map((user) => toUserResponse(user)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch users" });
  }
};

const createUser = async (req, res) => {
  try {
    const firstName = normalizeName(req.body.first_name);
    const lastName = normalizeName(req.body.last_name);
    const email = normalizeEmail(req.body.email);
    const role = normalizeRole(req.body.role || "officer");
    const status = normalizeStatus(req.body.status || "active");
    const incomingPassword = String(req.body.password || "");

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "First name, last name, and email are required" });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const password = incomingPassword || toTemporaryPassword(lastName);
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const newUser = await User.create({
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      status,
      password,
    });

    return res.status(201).json({
      success: true,
      data: toUserResponse(newUser),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create user" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = {};

    if (req.body.first_name !== undefined) {
      const firstName = normalizeName(req.body.first_name);
      if (!firstName) {
        return res.status(400).json({ message: "First name cannot be empty" });
      }
      updates.first_name = firstName;
    }

    if (req.body.last_name !== undefined) {
      const lastName = normalizeName(req.body.last_name);
      if (!lastName) {
        return res.status(400).json({ message: "Last name cannot be empty" });
      }
      updates.last_name = lastName;
    }

    if (req.body.email !== undefined) {
      const email = normalizeEmail(req.body.email);
      if (!email) {
        return res.status(400).json({ message: "Email cannot be empty" });
      }

      const duplicate = await User.findOne({ email, _id: { $ne: id } });
      if (duplicate) {
        return res.status(409).json({ message: "Email already exists" });
      }

      updates.email = email;
    }

    if (req.body.role !== undefined) {
      const role = normalizeRole(req.body.role);
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      updates.role = role;
    }

    if (req.body.status !== undefined) {
      const status = normalizeStatus(req.body.status);
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      updates.status = status;
    }

    if (req.body.password !== undefined) {
      const password = String(req.body.password || "");
      if (!isStrongPassword(password)) {
        return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
      }
      updates.password = password;
    }

    Object.assign(existingUser, updates);
    await existingUser.save();

    return res.status(200).json({
      success: true,
      data: toUserResponse(existingUser),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (req.user && String(req.user.id) === String(id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete user" });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
