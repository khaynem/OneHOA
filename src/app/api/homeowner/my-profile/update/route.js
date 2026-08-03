import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import User from "@/lib/server/models/users";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    const body = await request.json();

    const allowedFields = ["phone_number", "email", "job_title", "work_status", "household_members"];
    const inputKeys = Object.keys(body || {});
    const invalidKeys = inputKeys.filter(k => !allowedFields.includes(k));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { success: false, message: `Permission denied: Cannot edit read-only fields (${invalidKeys.join(", ")})` },
        { status: 400 }
      );
    }

    const { phone_number, email, job_title, work_status, household_members } = body || {};

    const normalizedEmail = String(user.email || "").trim().toLowerCase();

    const record = await Record.findOne({
      $or: [{ user_id: user.id }, { email: normalizedEmail }],
    });

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Homeowner record not found." },
        { status: 404 }
      );
    }

    const updates = {};
    if (phone_number !== undefined) updates.phone_number = String(phone_number).trim();
    if (job_title !== undefined) updates.job_title = String(job_title).trim();
    if (work_status !== undefined) updates.work_status = String(work_status).trim();

    if (email !== undefined) {
      const normalizedNewEmail = String(email || "").trim().toLowerCase();
      if (!normalizedNewEmail) {
        return NextResponse.json(
          { success: false, message: "Email address cannot be empty." },
          { status: 400 }
        );
      }

      // Check for duplicate in User collection
      const duplicateUser = await User.findOne({
        email: normalizedNewEmail,
        _id: { $ne: user.id }
      });
      if (duplicateUser) {
        return NextResponse.json(
          { success: false, message: "Email address is already in use by another user." },
          { status: 409 }
        );
      }

      // Check for duplicate in Record collection
      const duplicateRecord = await Record.findOne({
        email: normalizedNewEmail,
        _id: { $ne: record._id }
      });
      if (duplicateRecord) {
        return NextResponse.json(
          { success: false, message: "Email address is already in use by another homeowner record." },
          { status: 409 }
        );
      }

      updates.email = normalizedNewEmail;
    }

    if (household_members !== undefined) {
      if (!Array.isArray(household_members)) {
        return NextResponse.json(
          { success: false, message: "Household members must be an array." },
          { status: 400 }
        );
      }
      // Normalize and sanitize household members list
      updates.household_members = household_members.map(m => ({
        name: String(m.name || "").trim(),
        relationship: String(m.relationship || "").trim()
      })).filter(m => m.name !== "");
    }

    Object.assign(record, updates);
    await record.save();

    // If email was updated, update associated login user account too
    if (updates.email) {
      await User.updateOne({ _id: user.id }, { email: updates.email });
    }

    return NextResponse.json(
      { success: true, message: "Profile updated successfully!", data: record },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update profile details:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

