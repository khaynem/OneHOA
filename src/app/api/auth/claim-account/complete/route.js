import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import User from "@/lib/server/models/users";
import EmailVerification from "@/lib/server/models/emailVerification";
import { normalizeEmail } from "@/lib/server/auth";
import { sendAccountActivationEmail } from "@/lib/server/services/emailService";

export const runtime = "nodejs";

const ACTIVATION_CODE_EXPIRY_HOURS = 72;

function generateActivationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { recordId, email, verificationCode } = body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!recordId || !normalizedEmail || !verificationCode) {
      return NextResponse.json(
        { success: false, message: "Record ID, Email, and Verification Code are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Verify OTP
    const verification = await EmailVerification.findOne({
      email: normalizedEmail,
    }).sort({ createdAt: -1 });

    if (!verification || verification.expires_at.getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: "Verification code expired or not found. Please request a new code." },
        { status: 400 }
      );
    }

    const incomingHash = hashCode(verificationCode);
    if (incomingHash !== verification.code_hash) {
      return NextResponse.json(
        { success: false, message: "Invalid verification code." },
        { status: 400 }
      );
    }

    // 2. Fetch Homeowner Record
    const record = await Record.findById(recordId);
    if (!record) {
      return NextResponse.json(
        { success: false, message: "Homeowner record not found." },
        { status: 404 }
      );
    }

    // Check if record is already linked
    if (record.user_id) {
      const existingUser = await User.findById(record.user_id);
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "This homeowner record is already linked to an active account." },
          { status: 400 }
        );
      }
    }

    // Update email on record if not set
    if (!record.email) {
      record.email = normalizedEmail;
    }

    // 3. Generate activation code & User account in pending activation state
    const activationCode = generateActivationCode();
    const activationHash = hashCode(activationCode);
    const expiresAt = new Date(Date.now() + ACTIVATION_CODE_EXPIRY_HOURS * 60 * 60 * 1000);

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const tempPassword = crypto.randomBytes(32).toString("hex") + "A!a1";
      user = await User.create({
        first_name: record.first_name || "",
        last_name: record.last_name || "",
        email: normalizedEmail,
        password: tempPassword,
        role: "homeowner",
        status: "active",
        password_reset_code_hash: activationHash,
        password_reset_code_expires_at: expiresAt,
      });
    } else {
      const tempPassword = crypto.randomBytes(32).toString("hex") + "A!a1";
      user.password = tempPassword;
      user.password_reset_code_hash = activationHash;
      user.password_reset_code_expires_at = expiresAt;
      await user.save();
    }

    // Link user to record
    record.user_id = user._id;
    await record.save();

    // Build activation link
    const origin = req.nextUrl ? req.nextUrl.origin : (req.headers.get("origin") || req.headers.get("host") ? `http://${req.headers.get("host")}` : "http://localhost:3000");
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || origin).replace(/\/$/, "");
    const activationUrl = `${baseUrl}/activate-account?email=${encodeURIComponent(normalizedEmail)}&code=${activationCode}`;

    const fullName = `${record.first_name} ${record.last_name}`;
    const emailResult = await sendAccountActivationEmail({
      toEmail: normalizedEmail,
      fullName,
      activationCode,
      activationUrl,
      expiresInHours: ACTIVATION_CODE_EXPIRY_HOURS,
    });

    const responsePayload = {
      success: true,
      message: "Activation link sent! Please check your email to complete setting up your password.",
      activationUrl,
    };

    if (process.env.NODE_ENV !== "production" && emailResult.delivered === false) {
      responsePayload.dev_code = activationCode;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error("Claim account completion error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to complete account claim." },
      { status: 500 }
    );
  }
}
