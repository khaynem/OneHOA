import { NextResponse } from "next/server";
import { authCookieName, buildCookieOptions, requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const user = await requireAuth();

    const response = NextResponse.json({ message: "Logout successful" }, { status: 200 });
    response.cookies.set(authCookieName, "", {
      ...buildCookieOptions(),
      maxAge: 0,
    });

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 200,
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return response;
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { message: error.message || "Failed to logout" },
      { status }
    );
  }
}
