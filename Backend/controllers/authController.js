const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/users");
const { sendPasswordResetCode } = require("../services/emailService");

const RESET_CODE_EXPIRY_MINUTES = Number(process.env.RESET_CODE_EXPIRY_MINUTES || 10);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function generateResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashResetCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function buildAccountLookupQuery(normalizedEmail) {
  return {
    $or: [
      { email: normalizedEmail },
      { username: normalizedEmail },
    ],
  };
}

function createToken(payload) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

  if (!secret) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }

  return jwt.sign(payload, secret, { expiresIn });
}

function buildCookieOptions() {
  const maxAgeMs = 24 * 60 * 60 * 1000;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: maxAgeMs,
  };
}

const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne(buildAccountLookupQuery(normalizedEmail));
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const user = await User.create({ email: normalizedEmail, password, role });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to register user" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne(buildAccountLookupQuery(normalizedEmail));
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.email) {
      user.email = normalizedEmail;
      await user.save();
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken({ userId: user._id.toString(), role: user.role, email: user.email });

    res.cookie("auth_token", token, buildCookieOptions());

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to login" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne(buildAccountLookupQuery(normalizedEmail));
    if (!user.email) {
      user.email = normalizedEmail;
      await user.save();
    }


    if (!user) {
      return res.status(200).json({ message: "If an account exists, a reset code has been sent." });
    }

    const code = generateResetCode();
    const codeHash = hashResetCode(code);
    const expiresAt = new Date(Date.now() + (RESET_CODE_EXPIRY_MINUTES * 60 * 1000));

    user.password_reset_code_hash = codeHash;
    user.password_reset_code_expires_at = expiresAt;
    await user.save();

    const emailResult = await sendPasswordResetCode({
      toEmail: user.email,
      code,
      expiresInMinutes: RESET_CODE_EXPIRY_MINUTES,
    });

    const responsePayload = {
      message: "If an account exists, a reset code has been sent.",
    };

    if (process.env.NODE_ENV !== "production" && emailResult.delivered === false) {
      responsePayload.dev_reset_code = code;
      responsePayload.dev_note = "SMTP is not configured. Use this code for local testing only.";
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to process forgot password request" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, new_password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code || !new_password) {
      return res.status(400).json({ message: "Email, code, and new_password are required" });
    }

    const user = await User.findOne(buildAccountLookupQuery(normalizedEmail));
    if (!user || !user.password_reset_code_hash || !user.password_reset_code_expires_at) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (!user.email) {
      user.email = normalizedEmail;
    }

    if (user.password_reset_code_expires_at.getTime() < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    const incomingCodeHash = hashResetCode(code);
    if (incomingCodeHash !== user.password_reset_code_hash) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    user.password = new_password;
    user.password_reset_code_hash = null;
    user.password_reset_code_expires_at = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to reset password" });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to logout" });
  }
};

const me = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  me,
};
