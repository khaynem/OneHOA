import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Payment from "@/lib/server/models/payments";
import Record from "@/lib/server/models/records";
import { requireAuth } from "@/lib/server/auth";
import { getCoveredPeriodsFromPayment, inferPaymentStatus } from "@/lib/server/paymentsHelpers";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await requireAuth();
    await connectToDatabase();

    const now = new Date();
    const requestedMonths = Number(request.nextUrl.searchParams.get("months")) || 12;
    const monthsToTrack = Math.min(Math.max(requestedMonths, 1), 36);

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = new Date(currentMonthStart);
    startDate.setMonth(startDate.getMonth() - (monthsToTrack - 1));
    const startPeriod = startDate.getFullYear() * 100 + (startDate.getMonth() + 1);
    const endPeriod = currentMonthStart.getFullYear() * 100 + (currentMonthStart.getMonth() + 1);

    const endExclusive = new Date(currentMonthStart);
    endExclusive.setMonth(endExclusive.getMonth() + 1);

    const months = [];
    const monthKeySet = new Set();

    for (let i = 0; i < monthsToTrack; i += 1) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const key = `${year}-${String(month).padStart(2, "0")}`;

      months.push({
        key,
        month,
        year,
        label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
      });
      monthKeySet.add(key);
    }

    const records = await Record.find({})
      .select("_id first_name last_name household_no")
      .sort({ last_name: 1, first_name: 1 })
      .lean();

    const payments = await Payment.find({
      $or: [
        { payment_for_periods: { $elemMatch: { $gte: startPeriod, $lte: endPeriod } } },
        { billing_period: { $gte: startPeriod, $lte: endPeriod } },
        {
          date: { $gte: startDate, $lt: endExclusive },
          $or: [
            { billing_period: { $exists: false } },
            { billing_year: { $exists: false } },
            { billing_month: { $exists: false } },
          ],
        },
      ],
      "records._id": { $exists: true, $ne: null },
    })
      .select(
        "records._id date billing_month billing_year billing_period payment_for_periods payment_status payment_details payment_method"
      )
      .lean();

    const homeownerMonthStatus = new Map();

    for (const payment of payments) {
      const homeownerId = payment.records && payment.records._id ? String(payment.records._id) : null;
      if (!homeownerId) {
        continue;
      }

      const status = inferPaymentStatus(payment.payment_status, payment.payment_details, payment.payment_method);
      const coveredPeriods = getCoveredPeriodsFromPayment(payment, startPeriod, endPeriod);

      for (const period of coveredPeriods) {
        const year = Math.floor(period / 100);
        const month = period % 100;
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;

        if (!monthKeySet.has(monthKey)) {
          continue;
        }

        const compositeKey = `${homeownerId}:${monthKey}`;
        const current = homeownerMonthStatus.get(compositeKey);

        if (current !== "paid") {
          homeownerMonthStatus.set(compositeKey, status);
        }
      }
    }

    const homeowners = records.map((record) => {
      const homeownerId = String(record._id);

      const monthly_status = months.map((monthInfo) => {
        const lookupKey = `${homeownerId}:${monthInfo.key}`;
        return {
          month: monthInfo.month,
          year: monthInfo.year,
          label: monthInfo.label,
          status: homeownerMonthStatus.get(lookupKey) || "unpaid",
        };
      });

      const paidMonths = monthly_status.filter((entry) => entry.status === "paid").length;
      const unpaidMonths = monthly_status.length - paidMonths;
      const currentMonth = monthly_status[monthly_status.length - 1] || null;

      return {
        id: homeownerId,
        homeowner: `${record.first_name || ""} ${record.last_name || ""}`.trim(),
        household_no: record.household_no,
        monthly_status,
        summary: {
          paidMonths,
          unpaidMonths,
          currentMonthStatus: currentMonth ? currentMonth.status : "unpaid",
          pastDueMonths: Math.max(
            unpaidMonths - (currentMonth && currentMonth.status === "unpaid" ? 1 : 0),
            0
          ),
        },
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          trackedMonths: monthsToTrack,
          period: {
            start: startDate,
            endExclusive,
          },
          homeowners,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error loading payment tracker:", error);
    return NextResponse.json(
      { message: "An error occurred while loading payment tracker." },
      { status: 500 }
    );
  }
}
