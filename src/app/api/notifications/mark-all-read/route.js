import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Notification from "@/lib/server/models/notifications";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const user = await requireAuth();
    requireRole(user, ["president"]);
    await connectToDatabase();

    await Notification.updateMany(
      { recipient_user_id: user.id, read: false },
      { read: true, read_at: new Date() }
    );

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 200,
        detailSummary: "marked all notifications as read",
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

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
