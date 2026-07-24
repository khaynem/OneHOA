import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import EmailVerification from "@/lib/server/models/emailVerification";
import { normalizeEmail } from "@/lib/server/auth";

export const runtime = "nodejs";

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, code } = body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code) {
      return NextResponse.json(
        { success: false, message: "Email and verification code are required" },
        { status: 400 }
      );
    }

    const trimmedCode = String(code).trim();
    if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 6-digit verification code" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const verification = await EmailVerification.findOne({
      email: normalizedEmail,
    }).sort({ createdAt: -1 });

    if (!verification) {
      return NextResponse.json(
        { success: false, message: "No verification code found for this email. Please click 'Send Code' again." },
        { status: 400 }
      );
    }

    if (verification.expires_at.getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const incomingHash = hashCode(trimmedCode);
    if (incomingHash !== verification.code_hash) {
      return NextResponse.json(
        { success: false, message: "Invalid verification code. Please check your email and try again." },
        { status: 400 }
      );
    }

    verification.verified = true;
    verification.verified_at = new Date();
    await verification.save();

    return NextResponse.json(
      {
        success: true,
        message: "Email successfully verified!",
        verifiedEmail: normalizedEmail,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to verify registration code:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to verify code" },
      { status: 500 }
    );
  }
}
