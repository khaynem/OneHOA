import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Setting from "@/lib/server/models/settings";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";

export const runtime = "nodejs";

const DEFAULT_MONTHLY_DUES = 100;
const SETTING_KEY = "monthly_dues";

const normalizeAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
};

export async function GET() {
  try {
    await requireAuth();
    await connectToDatabase();

    const setting = await Setting.findOne({ key: SETTING_KEY }).lean();
    const amount = normalizeAmount(setting?.value) ?? DEFAULT_MONTHLY_DUES;

    return NextResponse.json({ amount }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ message: error.message || "Failed to load monthly dues." }, { status });
  }
}

export async function PUT(request) {
  let user;
  try {
    user = await requireAuth();
    requireRole(user, ["admin", "president"]);
    await connectToDatabase();

    const body = await request.json();
    const amount = normalizeAmount(body?.amount);

    if (!amount) {
      return NextResponse.json(
        { message: "Monthly dues amount must be a number greater than 0." },
        { status: 400 }
      );
    }

    const setting = await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      { value: amount },
      { new: true, upsert: true }
    ).lean();

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 200,
        detailSummary: `updated monthly dues to ₱${amount}`,
        metadata: { amount },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ amount: setting?.value ?? amount }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ message: error.message || "Failed to update monthly dues." }, { status });
  }
}
