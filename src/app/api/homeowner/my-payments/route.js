import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Payment from "@/lib/server/models/payments";
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
      .select("_id first_name last_name")
      .lean();

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Homeowner record not found." },
        { status: 404 }
      );
    }

    const payments = await Payment.find({ "records._id": record._id })
      .sort({ billing_year: -1, billing_month: -1, date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: payments }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch payments." },
      { status }
    );
  }
}
