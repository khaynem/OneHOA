import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import User from "@/lib/server/models/users";
import { getPasswordPolicyMessage, isStrongPassword, normalizeEmail } from "@/lib/server/auth";

export const runtime = "nodejs";

function buildAccountLookupQuery(normalizedEmail) {
  return {
    $or: [{ email: normalizedEmail }, { username: normalizedEmail }],
  };
}

function hashResetCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, code, new_password } = body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !code || !new_password) {
      return NextResponse.json(
        { message: "Email, code, and new_password are required" },
        { status: 400 }
      );
    }

    if (!isStrongPassword(new_password)) {
      return NextResponse.json({ message: getPasswordPolicyMessage() }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne(buildAccountLookupQuery(normalizedEmail));
    if (!user || !user.password_reset_code_hash || !user.password_reset_code_expires_at) {
      return NextResponse.json({ message: "Invalid or expired reset code" }, { status: 400 });
    }

    if (!user.email) {
      user.email = normalizedEmail;
    }

    if (user.password_reset_code_expires_at.getTime() < Date.now()) {
      return NextResponse.json({ message: "Invalid or expired reset code" }, { status: 400 });
    }

    const incomingCodeHash = hashResetCode(code);
    if (incomingCodeHash !== user.password_reset_code_hash) {
      return NextResponse.json({ message: "Invalid or expired reset code" }, { status: 400 });
    }

    user.password = new_password;
    user.password_reset_code_hash = null;
    user.password_reset_code_expires_at = null;
    await user.save();

    return NextResponse.json({ message: "Password reset successful" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
