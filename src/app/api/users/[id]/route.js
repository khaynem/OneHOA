import { NextResponse } from "next/server";
import mongoose from "mongoose";
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

function normalizeUserId(rawId, pathname) {
  const idCandidate = Array.isArray(rawId) ? rawId[0] : rawId;
  const trimmed = String(idCandidate || "").trim();
  if (trimmed) {
    return trimmed;
  }

  const path = String(pathname || "");
  const segments = path.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : "";
}

export async function PUT(request, { params }) {
  let actor;
  try {
    actor = await requireAuth();
    requireRole(actor, ["admin"]);
    await connectToDatabase();

    const normalizedId = normalizeUserId(params?.id, request.nextUrl?.pathname);
    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const existingUser = await User.findById(normalizedId);
    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates = {};

    if (body.first_name !== undefined) {
      const firstName = normalizeName(body.first_name);
      if (!firstName) {
        return NextResponse.json({ message: "First name cannot be empty" }, { status: 400 });
      }
      updates.first_name = firstName;
    }

    if (body.last_name !== undefined) {
      const lastName = normalizeName(body.last_name);
      if (!lastName) {
        return NextResponse.json({ message: "Last name cannot be empty" }, { status: 400 });
      }
      updates.last_name = lastName;
    }

    if (body.email !== undefined) {
      const email = normalizeEmail(body.email);
      if (!email) {
        return NextResponse.json({ message: "Email cannot be empty" }, { status: 400 });
      }

      const duplicate = await User.findOne({ email, _id: { $ne: normalizedId } });
      if (duplicate) {
        return NextResponse.json({ message: "Email already exists" }, { status: 409 });
      }

      updates.email = email;
    }

    if (body.role !== undefined) {
      const role = normalizeRole(body.role);
      if (!ALLOWED_ROLES.includes(role)) {
        return NextResponse.json({ message: "Invalid role" }, { status: 400 });
      }
      updates.role = role;
    }

    if (body.status !== undefined) {
      const status = normalizeStatus(body.status);
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json({ message: "Invalid status" }, { status: 400 });
      }
      updates.status = status;
    }

    if (body.password !== undefined) {
      const password = String(body.password || "");
      if (!isStrongPassword(password)) {
        return NextResponse.json({ message: getPasswordPolicyMessage() }, { status: 400 });
      }
      updates.password = password;
    }

    Object.assign(existingUser, updates);
    await existingUser.save();

    try {
      await writeAuditLog({
        request,
        user: actor,
        statusCode: 200,
        detailSummary: `updated user ${existingUser.email}`,
        metadata: {
          user_id: String(existingUser._id || ""),
          email: existingUser.email,
          role: existingUser.role,
          status: existingUser.status,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ success: true, data: toUserResponse(existingUser) }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ message: error.message || "Failed to update user" }, { status });
  }
}

export async function DELETE(request, { params }) {
  let actor;
  try {
    actor = await requireAuth();
    requireRole(actor, ["admin"]);
    await connectToDatabase();

    const normalizedId = normalizeUserId(params?.id, request.nextUrl?.pathname);
    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    if (actor && String(actor.id) === String(normalizedId)) {
      return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 });
    }

    const deletedUser = await User.findByIdAndDelete(normalizedId);
    if (!deletedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    try {
      await writeAuditLog({
        request,
        user: actor,
        statusCode: 200,
        detailSummary: `deleted user ${deletedUser.email}`,
        metadata: {
          user_id: String(deletedUser._id || ""),
          email: deletedUser.email,
          role: deletedUser.role,
          status: deletedUser.status,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ message: error.message || "Failed to delete user" }, { status });
  }
}
