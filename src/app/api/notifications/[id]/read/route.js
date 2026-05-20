import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/server/db";
import Notification from "@/lib/server/models/notifications";
import { requireAuth, requireRole } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  try {
    const user = await requireAuth();
    requireRole(user, ["president"]);
    await connectToDatabase();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid notification ID" }, { status: 400 });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient_user_id: user.id },
      { read: true, read_at: new Date() },
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { message: error.message || "Failed to update notification" },
      { status }
    );
  }
}
