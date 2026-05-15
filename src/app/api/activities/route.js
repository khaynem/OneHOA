import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/server/db";
import Activity from "@/lib/server/models/activities";
import "@/lib/server/models/pictures";
import "@/lib/server/models/users";
import { requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    await connectToDatabase();

    const activities = await Activity.find()
      .populate("pictures._id")
      .populate("users._id", "first_name last_name email role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: activities }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch activities." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let user;
  try {
    user = await requireAuth();
    await connectToDatabase();

    const body = await request.json();
    const { title, content, date, archived, "pictures._id": pictureId } = body || {};

    if (!String(title || "").trim()) {
      return NextResponse.json(
        { success: false, message: "Activity title is required." },
        { status: 400 }
      );
    }

    const payload = {
      title: String(title).trim(),
      content: String(content || "").trim(),
      date: date ? new Date(date) : new Date(),
      archived: Boolean(archived),
    };

    if (pictureId) {
      if (!mongoose.Types.ObjectId.isValid(pictureId)) {
        return NextResponse.json({ success: false, message: "Invalid picture id." }, { status: 400 });
      }
      payload["pictures._id"] = pictureId;
    }

    if (user && user.id && mongoose.Types.ObjectId.isValid(user.id)) {
      payload["users._id"] = user.id;
    }

    const created = await Activity.create(payload);
    const populated = await Activity.findById(created._id)
      .populate("pictures._id")
      .populate("users._id", "first_name last_name email role");

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 201,
        detailSummary: `Created activity ${payload.title}`,
        metadata: {
          activity_id: String(created._id || ""),
          title: payload.title,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to create activity." },
      { status: 500 }
    );
  }
}
