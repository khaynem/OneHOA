import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import User from "@/lib/server/models/users";
import { isStrongPassword, getPasswordPolicyMessage, normalizeEmail } from "@/lib/server/auth";

export const runtime = "nodejs";

function buildAccountLookupQuery(normalizedEmail) {
  return {
    $or: [{ email: normalizedEmail }, { username: normalizedEmail }],
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, role, first_name, last_name, status } = body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json({ message: getPasswordPolicyMessage() }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await User.findOne(buildAccountLookupQuery(normalizedEmail));
    if (existingUser) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
      role,
      first_name: String(first_name || "").trim(),
      last_name: String(last_name || "").trim(),
      status,
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to register user" },
      { status: 500 }
    );
  }
}
