import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Payment from "@/lib/server/models/payments";
import Activity from "@/lib/server/models/activities";
import "@/lib/server/models/address";
import "@/lib/server/models/pictures";
import "@/lib/server/models/users";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

const MIN_TRACKING_PERIOD = 202502;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function resolveHomeownerEntryPeriod(record) {
  let year = 2025;
  let month = 2;

  if (record?.entry_date) {
    const d = new Date(record.entry_date);
    if (!Number.isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }
  }

  if (record?.entry_month) {
    const monthIdx = MONTH_NAMES.indexOf(record.entry_month);
    if (monthIdx !== -1) {
      month = monthIdx + 1;
    }
  }

  const computed = year * 100 + month;
  return Math.max(MIN_TRACKING_PERIOD, computed);
}

function generateEligiblePeriods(startPeriod, endPeriod) {
  const periods = [];
  let currentYear = Math.floor(startPeriod / 100);
  let currentMonth = startPeriod % 100;

  const endYear = Math.floor(endPeriod / 100);
  const endMonth = endPeriod % 100;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    periods.push({
      period: currentYear * 100 + currentMonth,
      year: currentYear,
      month: currentMonth,
      label: `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`,
    });

    currentMonth += 1;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
  }

  return periods;
}

export async function GET() {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    const normalizedEmail = String(user.email || "").trim().toLowerCase();

    // Find homeowner record
    let record = null;
    if (normalizedEmail) {
      record = await Record.findOne({
        email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      })
        .populate("address._id")
        .populate("pictures._id")
        .lean();
    }

    if (!record && user.first_name && user.last_name) {
      record = await Record.findOne({
        first_name: { $regex: new RegExp(`^${user.first_name.trim()}$`, "i") },
        last_name: { $regex: new RegExp(`^${user.last_name.trim()}$`, "i") },
      })
        .populate("address._id")
        .populate("pictures._id")
        .lean();
    }

    // Fallback if no matching record found yet (e.g. admin test account)
    if (!record) {
      record = await Record.findOne({ archived: { $ne: true } })
        .populate("address._id")
        .populate("pictures._id")
        .lean();
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentPeriod = currentYear * 100 + currentMonth;
    const currentMonthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

    let payments = [];
    if (record?._id) {
      payments = await Payment.find({ "records._id": record._id }).lean();
    }

    // Collect paid YYYYMM periods
    const paidPeriodSet = new Set();
    payments.forEach((p) => {
      const status = String(p.payment_status || "").toLowerCase();
      if (status === "paid" || !status) {
        if (Array.isArray(p.payment_for_periods) && p.payment_for_periods.length > 0) {
          p.payment_for_periods.forEach((per) => paidPeriodSet.add(Number(per)));
        } else if (p.billing_period) {
          paidPeriodSet.add(Number(p.billing_period));
        }
      }
    });

    const isCurrentMonthPaid = paidPeriodSet.has(currentPeriod);

    // Calculate eligible periods
    const entryPeriod = resolveHomeownerEntryPeriod(record);
    const eligiblePeriods = generateEligiblePeriods(entryPeriod, currentPeriod);

    const pendingPeriods = eligiblePeriods.filter((item) => !paidPeriodSet.has(item.period));
    const paidPeriods = eligiblePeriods.filter((item) => paidPeriodSet.has(item.period));

    const totalEligibleCount = eligiblePeriods.length;
    const totalPaidCount = paidPeriods.length;
    const pendingMonthsCount = pendingPeriods.length;

    const paidPercentage = totalEligibleCount > 0
      ? Math.round((totalPaidCount / totalEligibleCount) * 100)
      : 100;

    // Fetch active announcements / activities for the announcement board
    const announcements = await Activity.find({ archived: { $ne: true } })
      .populate("pictures._id")
      .populate("users._id", "first_name last_name email role")
      .sort({ date: -1, createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json(
      {
        success: true,
        record: record || null,
        stats: {
          isCurrentMonthPaid,
          currentMonthLabel,
          currentPeriod,
          pendingMonthsCount,
          pendingPeriods: pendingPeriods.map((p) => p.label),
          paidPercentage,
          totalPaidCount,
          totalEligibleCount,
        },
        announcements,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Homeowner Dashboard API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load homeowner dashboard." },
      { status: error.status || 500 }
    );
  }
}
