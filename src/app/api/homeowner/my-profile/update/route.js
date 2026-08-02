import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    const body = await request.json();
    const { phone_number, job_title, work_status, occupant_status } = body || {};

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
    if (occupant_status !== undefined) updates.occupant_status = String(occupant_status).trim();

    Object.assign(record, updates);
    await record.save();

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
