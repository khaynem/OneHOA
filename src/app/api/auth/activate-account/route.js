import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import User from "@/lib/server/models/users";
import { isStrongPassword, getPasswordPolicyMessage, normalizeEmail } from "@/lib/server/auth";

export const runtime = "nodejs";

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, code, new_password } = body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code || !new_password) {
      return NextResponse.json(
        { success: false, message: "Email, activation code, and new password are required." },
        { status: 400 }
      );
    }

    const trimmedCode = String(code).trim();
    if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 6-digit activation code." },
        { status: 400 }
      );
    }

    if (!isStrongPassword(new_password)) {
      return NextResponse.json(
        { success: false, message: getPasswordPolicyMessage() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No account found for this email address." },
        { status: 404 }
      );
    }

    if (!user.password_reset_code_hash || !user.password_reset_code_expires_at) {
      return NextResponse.json(
        { success: false, message: "No activation code found. Your account may already be activated. Please try logging in." },
        { status: 400 }
      );
    }

    if (user.password_reset_code_expires_at.getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: "Activation code has expired. Please contact the HOA officers to request a new activation email." },
        { status: 400 }
      );
    }

    const incomingHash = hashCode(trimmedCode);
    if (incomingHash !== user.password_reset_code_hash) {
      return NextResponse.json(
        { success: false, message: "Invalid activation code. Please check your email and try again." },
        { status: 400 }
      );
    }

    // Set the new password and clear the activation code
    user.password = new_password;
    user.password_reset_code_hash = null;
    user.password_reset_code_expires_at = null;
    await user.save();

    // Ensure associated Homeowner Record references this User ID
    const Record = (await import("@/lib/server/models/records")).default;
    await Record.updateOne({ email: normalizedEmail, user_id: { $exists: false } }, { user_id: user._id });

    return NextResponse.json(
      { success: true, message: "Account activated successfully! You can now log in with your new password." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Account activation failed:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to activate account." },
      { status: 500 }
    );
  }
}
