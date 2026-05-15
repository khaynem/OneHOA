import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import User from "./models/users";
import { connectToDatabase } from "./db";

const TOKEN_COOKIE_NAME = "auth_token";
const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters long and include uppercase, lowercase, and special characters.";
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isStrongPassword(password) {
  return STRONG_PASSWORD_REGEX.test(String(password || ""));
}

export function getPasswordPolicyMessage() {
  return PASSWORD_POLICY_MESSAGE;
}

export function createToken(payload) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

  if (!secret) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }

  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }

  return jwt.verify(token, secret);
}

export async function getAuthTokenFromRequest() {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(TOKEN_COOKIE_NAME)?.value || null;

  const headerStore = await headers();
  const authHeader = headerStore.get("authorization") || "";
  const headerToken = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  return headerToken || cookieToken;
}

export function buildCookieOptions() {
  const maxAgeSeconds = 24 * 60 * 60;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  };
}

export async function requireAuth() {
  const token = await getAuthTokenFromRequest();

  if (!token) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    const error = new Error("Invalid or expired token");
    error.status = 401;
    throw error;
  }

  await connectToDatabase();
  const user = await User.findById(decoded.userId).select("_id email first_name last_name role");
  if (!user) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

export function requireRole(user, allowedRoles = []) {
  if (!user) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  if (!allowedRoles.includes(user.role)) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
}

export const authCookieName = TOKEN_COOKIE_NAME;
