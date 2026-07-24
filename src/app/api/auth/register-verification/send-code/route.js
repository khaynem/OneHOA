import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import EmailVerification from "@/lib/server/models/emailVerification";
import { normalizeEmail } from "@/lib/server/auth";
import { sendRegistrationVerificationCode } from "@/lib/server/services/emailService";

export const runtime = "nodejs";

const CODE_EXPIRY_MINUTES = 10;

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ success: false, message: "Valid email address is required" }, { status: 400 });
    }

    await connectToDatabase();

    const code = generateVerificationCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    // Delete any existing verification records for this email
    await EmailVerification.deleteMany({ email: normalizedEmail });

    await EmailVerification.create({
      email: normalizedEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
      verified: false,
    });

    const emailResult = await sendRegistrationVerificationCode({
      toEmail: normalizedEmail,
      code,
      expiresInMinutes: CODE_EXPIRY_MINUTES,
    });

    const responsePayload = {
      success: true,
      message: "Verification code sent to your email.",
    };

    if (process.env.NODE_ENV !== "production" && emailResult.delivered === false) {
      responsePayload.dev_code = code;
      responsePayload.dev_note = "SMTP is not configured. Use this code for local testing.";
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error("Failed to send registration verification code:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to send verification code" },
      { status: 500 }
    );
  }
}
