import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import AuditLog from "@/lib/server/models/auditLogs";
import { requireAuth, requireRole } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await requireAuth();
    requireRole(user, ["president", "admin"]);
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const search = String(searchParams.get("search") || "").trim();
    const actorRole = String(searchParams.get("actor_role") || "").trim().toLowerCase();

    const filter = {};

    if (search) {
      filter.$or = [
        { actor_email: { $regex: search, $options: "i" } },
        { summary: { $regex: search, $options: "i" } },
        { path: { $regex: search, $options: "i" } },
      ];
    }

    if (actorRole) {
      filter.actor_role = actorRole;
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actor_user_id", "_id email role first_name last_name"),
      AuditLog.countDocuments(filter),
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
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { message: error.message || "Failed to fetch audit logs" },
      { status }
    );
  }
}
