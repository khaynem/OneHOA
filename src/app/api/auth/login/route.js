import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import User from "@/lib/server/models/users";
import { buildCookieOptions, createToken, normalizeEmail } from "@/lib/server/auth";

export const runtime = "nodejs";

function buildAccountLookupQuery(normalizedEmail) {
  return {
    $or: [{ email: normalizedEmail }, { username: normalizedEmail }],
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne(buildAccountLookupQuery(normalizedEmail));
    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "inactive") {
      return NextResponse.json(
        { message: "Account is inactive. Please contact an administrator." },
        { status: 403 }
      );
    }

    if (!user.email) {
      user.email = normalizedEmail;
      await user.save();
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const token = createToken({ userId: user._id.toString(), role: user.role, email: user.email });

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    response.cookies.set("auth_token", token, buildCookieOptions());

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Failed to login" },
      { status: 500 }
    );
  }
}
