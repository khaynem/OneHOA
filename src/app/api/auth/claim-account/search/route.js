import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Address from "@/lib/server/models/address";
import User from "@/lib/server/models/users";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const { phase, block, lot, first_name, last_name } = body || {};

    if (!phase || !block || !lot || !first_name || !last_name) {
      return NextResponse.json(
        { success: false, message: "Phase, Block, Lot, First Name, and Last Name are required to search masterlist." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const address = await Address.findOne({
      phase: Number(phase),
      block: Number(block),
      lot: Number(lot),
    }).select("_id").lean();

    if (!address) {
      return NextResponse.json(
        { success: true, matchFound: false, message: "No matching homeowner record found." },
        { status: 200 }
      );
    }

    const trimmedFirstName = String(first_name).trim();
    const trimmedLastName = String(last_name).trim();

    const record = await Record.findOne({
      "address._id": address._id,
      first_name: { $regex: new RegExp(`^${trimmedFirstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      last_name: { $regex: new RegExp(`^${trimmedLastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      archived: { $ne: true },
    }).lean();

    if (!record) {
      return NextResponse.json(
        { success: true, matchFound: false, message: "No matching homeowner record found." },
        { status: 200 }
      );
    }

    // Check if record is linked to a user account
    let isLinked = false;
    let existingUser = null;

    if (record.user_id) {
      existingUser = await User.findById(record.user_id).select("_id email").lean();
      if (existingUser) isLinked = true;
    }

    if (!isLinked && record.email) {
      existingUser = await User.findOne({ email: record.email.trim().toLowerCase() }).select("_id email").lean();
      if (existingUser) {
        isLinked = true;
        // Backfill user_id in record if missing
        await Record.updateOne({ _id: record._id }, { user_id: existingUser._id });
      }
    }

    return NextResponse.json(
      {
        success: true,
        matchFound: true,
        isLinked,
        recordId: record._id.toString(),
        existingEmail: record.email || "",
        fullName: `${record.first_name} ${record.last_name}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Claim account search error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to search homeowner record." },
      { status: 500 }
    );
  }
}
