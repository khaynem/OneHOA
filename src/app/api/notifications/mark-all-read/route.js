import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Notification from "@/lib/server/models/notifications";
import { requireAuth, requireRole } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function PATCH() {
  try {
    const user = await requireAuth();
    requireRole(user, ["president"]);
    await connectToDatabase();

    await Notification.updateMany(
      { recipient_user_id: user.id, read: false },
      { read: true, read_at: new Date() }
    );

    return NextResponse.json(
      { success: true, message: "All notifications marked as read" },
      { status: 200 }
    );
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { message: error.message || "Failed to update notifications" },
      { status }
    );
  }
}
