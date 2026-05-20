import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import User from "@/lib/server/models/users";
import { requireAuth, requireRole, isStrongPassword, getPasswordPolicyMessage, normalizeEmail } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["admin", "president", "officer"];
const ALLOWED_STATUSES = ["active", "inactive"];

function normalizeName(value) {
  return String(value || "").replace(/[^a-zA-Z\s]/g, "").trim();
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
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

export async function GET(request) {
  try {
    const user = await requireAuth();
    requireRole(user, ["admin"]);
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const search = String(searchParams.get("search") || "").trim();
    const role = normalizeRole(searchParams.get("role"));
    const status = normalizeStatus(searchParams.get("status"));

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

    return NextResponse.json({ success: true, data: users.map((item) => toUserResponse(item)) }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ message: error.message || "Failed to fetch users" }, { status });
  }
}

export async function POST(request) {
  let actor;
  try {
    actor = await requireAuth();
    requireRole(actor, ["admin"]);
    await connectToDatabase();

    const body = await request.json();
    const firstName = normalizeName(body?.first_name);
    const lastName = normalizeName(body?.last_name);
    const email = normalizeEmail(body?.email);
    const role = normalizeRole(body?.role || "officer");
    const status = normalizeStatus(body?.status || "active");
    const incomingPassword = String(body?.password || "");

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { message: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const password = incomingPassword || toTemporaryPassword(lastName);
    if (!isStrongPassword(password)) {
      return NextResponse.json({ message: getPasswordPolicyMessage() }, { status: 400 });
    }

    const newUser = await User.create({
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      status,
      password,
    });

    try {
      await writeAuditLog({
        request,
        user: actor,
        statusCode: 201,
        detailSummary: `created user ${email}`,
        metadata: {
          user_id: String(newUser._id || ""),
          email,
          role,
          status,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ success: true, data: toUserResponse(newUser) }, { status: 201 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ message: error.message || "Failed to create user" }, { status });
  }
}
