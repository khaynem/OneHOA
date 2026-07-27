import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Address from "@/lib/server/models/address";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role !== "homeowner") {
      return NextResponse.json(
        { success: false, message: "Access denied. Homeowner role required." },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const record = await Record.findOne({ email: user.email })
      .populate("address._id")
      .populate("pictures._id")
      .lean();

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          message: "Homeowner record not found. Please contact the HOA admin.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch profile." },
      { status }
    );
  }
}
