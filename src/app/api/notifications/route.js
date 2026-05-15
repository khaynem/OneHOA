import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Notification from "@/lib/server/models/notifications";
import "@/lib/server/models/auditLogs";
import { requireAuth, requireRole } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await requireAuth();
    requireRole(user, ["president"]);
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { recipient_user_id: user.id };

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("audit_log_id"),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, read: false }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: items,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          unreadCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { message: error.message || "Failed to fetch notifications" },
      { status }
    );
  }
}
