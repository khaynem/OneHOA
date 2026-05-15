import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/server/db";
import Activity from "@/lib/server/models/activities";
import "@/lib/server/models/pictures";
import "@/lib/server/models/users";
import { requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  let user;
  try {
    user = await requireAuth();
    await connectToDatabase();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid activity ID." }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, date, archived, "pictures._id": pictureId } = body || {};

    const payload = {};

    if (title !== undefined) {
      if (!String(title).trim()) {
        return NextResponse.json(
          { success: false, message: "Activity title cannot be empty." },
          { status: 400 }
        );
      }
      payload.title = String(title).trim();
    }

    if (content !== undefined) {
      payload.content = String(content || "").trim();
    }

    if (date !== undefined) {
      payload.date = date ? new Date(date) : null;
    }

    if (archived !== undefined) {
      payload.archived = Boolean(archived);
    }

    if (pictureId !== undefined) {
      if (pictureId && !mongoose.Types.ObjectId.isValid(pictureId)) {
        return NextResponse.json({ success: false, message: "Invalid picture id." }, { status: 400 });
      }
      payload["pictures._id"] = pictureId || null;
    }

    const updated = await Activity.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("pictures._id")
      .populate("users._id", "email role");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Activity not found." }, { status: 404 });
    }

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 200,
        detailSummary: `updated activity ${updated.title || id}`,
        metadata: {
          activity_id: String(updated._id || ""),
          title: updated.title || "",
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update activity." },
      { status: 500 }
    );
  }
}
