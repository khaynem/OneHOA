import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/server/db";
import Payment from "@/lib/server/models/payments";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    await requireAuth();
    await connectToDatabase();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid payment id format." }, { status: 400 });
    }

    const payment = await Payment.findById(id)
      .populate("records._id", "first_name last_name household_no")
      .populate("recorded_by", "first_name last_name email role")
      .lean();

    if (!payment) {
      return NextResponse.json({ message: "Payment not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment }, { status: 200 });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching the payment." },
      { status: 500 }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ message: "Update payment is not implemented yet." }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ message: "Delete payment is not implemented yet." }, { status: 501 });
}
