import { NextResponse } from "next/server";
import { authCookieName, buildCookieOptions, requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireAuth();

    const response = NextResponse.json({ message: "Logout successful" }, { status: 200 });
    response.cookies.set(authCookieName, "", {
      ...buildCookieOptions(),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { message: error.message || "Failed to logout" },
      { status }
    );
  }
}
