import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import User from "@/lib/server/models/users";
import "@/lib/server/models/address";
import "@/lib/server/models/pictures";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    const normalizedEmail = String(user.email || "").trim().toLowerCase();

    // Find homeowner record matching current logged in user
    let record = null;
    if (normalizedEmail) {
      record = await Record.findOne({
        email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      })
        .populate("address._id")
        .populate("pictures._id")
        .lean();
    }

    if (!record && user.first_name && user.last_name) {
      record = await Record.findOne({
        first_name: { $regex: new RegExp(`^${user.first_name.trim()}$`, "i") },
        last_name: { $regex: new RegExp(`^${user.last_name.trim()}$`, "i") },
      })
        .populate("address._id")
        .populate("pictures._id")
        .lean();
    }

    // Fallback for admin or officer testing the page
    if (!record) {
      record = await Record.findOne({ archived: { $ne: true } })
        .populate("address._id")
        .populate("pictures._id")
        .lean();
    }

    // Fetch Officers and President Masterlist record
    const officers = await User.find({
      role: { $in: ["president", "officer", "admin"] },
      status: "active",
    })
      .select("first_name last_name email role status createdAt")
      .sort({ role: 1, last_name: 1, first_name: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        record: record || null,
        userAccount: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        officers: officers.map((off) => ({
          id: off._id.toString(),
          first_name: off.first_name || "",
          last_name: off.last_name || "",
          email: off.email,
          role: off.role,
          roleLabel:
            off.role === "president"
              ? "HOA President"
              : off.role === "admin"
              ? "System Administrator"
              : "HOA Officer",
          status: off.status,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Homeowner Profile API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load homeowner profile." },
      { status: error.status || 500 }
    );
  }
}
