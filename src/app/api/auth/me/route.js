import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ message: error.message || "Failed to fetch user" }, { status });
  }
}
