import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import User from "@/lib/server/models/users";
import { normalizeEmail } from "@/lib/server/auth";
import { sendPasswordResetCode } from "@/lib/server/services/emailService";

export const runtime = "nodejs";

const RESET_CODE_EXPIRY_MINUTES = Number(process.env.RESET_CODE_EXPIRY_MINUTES || 10);

function buildAccountLookupQuery(normalizedEmail) {
  return {
    $or: [{ email: normalizedEmail }, { username: normalizedEmail }],
  };
}

function generateResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashResetCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne(buildAccountLookupQuery(normalizedEmail));
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists, a reset code has been sent." },
        { status: 200 }
      );
    }

    if (!user.email) {
      user.email = normalizedEmail;
      await user.save();
    }

    const code = generateResetCode();
    const codeHash = hashResetCode(code);
    const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

    user.password_reset_code_hash = codeHash;
    user.password_reset_code_expires_at = expiresAt;
    await user.save();

    const emailResult = await sendPasswordResetCode({
      toEmail: user.email,
      code,
      expiresInMinutes: RESET_CODE_EXPIRY_MINUTES,
    });

    const responsePayload = {
      message: "If an account exists, a reset code has been sent.",
    };

    if (process.env.NODE_ENV !== "production" && emailResult.delivered === false) {
      responsePayload.dev_reset_code = code;
      responsePayload.dev_note = "SMTP is not configured. Use this code for local testing only.";
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to process forgot password request" },
      { status: 500 }
    );
  }
}
