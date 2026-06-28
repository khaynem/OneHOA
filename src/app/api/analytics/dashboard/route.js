import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Payment from "@/lib/server/models/payments";
import Activity from "@/lib/server/models/activities";
import { requireAuth } from "@/lib/server/auth";
import Picture from "@/lib/server/models/pictures";

export const runtime = "nodejs";

const PENDING_START_YEAR = 2026;
const PENDING_START_MONTH = 1;

function formatPaymentAmount(amount) {
  const value = Number(amount) || 0;
  return `P${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateToPeriod(dateInput) {
  const dateValue = new Date(dateInput);
  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return dateValue.getFullYear() * 100 + (dateValue.getMonth() + 1);
}

function getCoveredPeriodsFromPayment(payment, startPeriod, endPeriod) {
  const coveredPeriods =
    Array.isArray(payment.payment_for_periods) && payment.payment_for_periods.length > 0
      ? payment.payment_for_periods
      : [
          Number(payment.billing_period) ||
            (Number(payment.billing_year) >= 2000 && Number(payment.billing_month) >= 1
              ? Number(payment.billing_year) * 100 + Number(payment.billing_month)
              : null) ||
            dateToPeriod(payment.date) ||
            dateToPeriod(payment.createdAt),
        ];

  return coveredPeriods
    .map((period) => Number(period))
    .filter((period) => Number.isInteger(period) && period >= startPeriod && period <= endPeriod);
}

function isPaymentMarkedPaid(payment) {
  if (payment.payment_status === "paid") {
    return true;
  }

  if (payment.payment_status === "unpaid") {
    return false;
  }

  const statusText = `${payment.payment_details || ""} ${payment.payment_method || ""}`;
  return !/unpaid/i.test(statusText);
}

function nextPeriod(period) {
  const year = Math.floor(period / 100);
  const month = period % 100;
  if (month === 12) {
    return (year + 1) * 100 + 1;
  }

  return year * 100 + (month + 1);
}

function isOwnerOccupant(value) {
  return String(value || "").trim().toLowerCase() === "owner";
}

export async function GET() {
  try {
    await requireAuth();
    await connectToDatabase();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    const currentMonth = monthStart.getMonth() + 1;
    const currentYear = monthStart.getFullYear();
    const currentPeriod = currentYear * 100 + currentMonth;

    const pendingStartDate = new Date(PENDING_START_YEAR, PENDING_START_MONTH - 1, 1);
    const pendingStartPeriod = PENDING_START_YEAR * 100 + PENDING_START_MONTH;
    const trackedMonths =
      (currentYear - PENDING_START_YEAR) * 12 + (currentMonth - PENDING_START_MONTH) + 1;

    const [homeownersRaw, trackedPayments, recentPaymentsRaw, previousActivitiesRaw] =
      await Promise.all([
        Record.find({ archived: { $ne: true } }).select("_id occupant_status").lean(),
        Payment.find({
          $or: [
            { payment_for_periods: { $elemMatch: { $gte: pendingStartPeriod, $lte: currentPeriod } } },
            { billing_period: { $gte: pendingStartPeriod, $lte: currentPeriod } },
            {
              billing_year: { $gte: PENDING_START_YEAR, $lte: currentYear },
              billing_month: { $gte: 1, $lte: 12 },
            },
            {
              createdAt: { $gte: pendingStartDate, $lt: nextMonthStart },
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
            "records._id payment_for_periods billing_period billing_year billing_month payment_status payment_details payment_method date createdAt"
          )
          .lean(),
        Payment.find()
          .populate({
            path: "records._id",
            select: "first_name middle_name last_name generated_id pictures._id",
            populate: {
              path: "pictures._id",
              select: "path"
            }
          })
          .sort({ createdAt: -1 })
          .limit(5),
        Activity.find().sort({ createdAt: -1 }).limit(5),
      ]);

    const homeowners = homeownersRaw.filter((homeowner) => isOwnerOccupant(homeowner.occupant_status));
    const paidPeriodsByHomeowner = new Map();

    for (const payment of trackedPayments) {
      const homeownerId = payment.records && payment.records._id ? String(payment.records._id) : null;
      if (!homeownerId || !isPaymentMarkedPaid(payment)) {
        continue;
      }

      const coveredPeriods = getCoveredPeriodsFromPayment(payment, pendingStartPeriod, currentPeriod);
      if (coveredPeriods.length === 0) {
        continue;
      }

      if (!paidPeriodsByHomeowner.has(homeownerId)) {
        paidPeriodsByHomeowner.set(homeownerId, new Set());
      }

      for (const period of coveredPeriods) {
        paidPeriodsByHomeowner.get(homeownerId).add(period);
      }
    }

    let upcomingPayments = 0;
    let pendingPayments = 0;

    for (const homeowner of homeowners) {
      const homeownerId = String(homeowner._id);
      const activeStartPeriod = pendingStartPeriod;

      if (activeStartPeriod > currentPeriod) {
        continue;
      }

      const paidSet = paidPeriodsByHomeowner.get(homeownerId) || new Set();

      if (!paidSet.has(currentPeriod)) {
        upcomingPayments += 1;
      }

      let isPending = false;
      let periodCursor = activeStartPeriod;
      while (periodCursor < currentPeriod) {
        if (!paidSet.has(periodCursor)) {
          isPending = true;
          break;
        }
        periodCursor = nextPeriod(periodCursor);
      }
      if (isPending) {
        pendingPayments += 1;
      }
    }

    const totalHomeowners = homeowners.length;

    const recentPayments = recentPaymentsRaw.map((payment) => {
      const homeownerRecord = payment.records && payment.records._id ? payment.records._id : null;
      const middleInitial = homeownerRecord?.middle_name
        ? ` ${String(homeownerRecord.middle_name).trim().charAt(0).toUpperCase()}.`
        : "";
      const homeownerName = homeownerRecord
        ? `${homeownerRecord.first_name || ""}${middleInitial} ${homeownerRecord.last_name || ""}`.trim()
        : "Unlinked Homeowner";

      const idText = homeownerRecord?.generated_id ? `#${homeownerRecord.generated_id}` : "";

      const photoUrl = homeownerRecord?.pictures?._id?.path || "";

      return {
        id: payment._id,
        homeowner: idText ? `${homeownerName} (${idText})` : homeownerName,
        details: payment.payment_details || payment.payment_method || "Payment",
        amount: formatPaymentAmount(payment.amount),
        date: payment.createdAt,
        photoUrl,
      };
    });

    const previousActivities = previousActivitiesRaw.map((activity) => ({
      id: activity._id,
      title: activity.title,
      date: activity.date,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          trackedMonths,
          stats: {
            totalHomeowners,
            pendingPayments,
            upcomingPayments,
          },
          recentPayments,
          previousActivities,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to load dashboard analytics." },
      { status: 500 }
    );
  }
}
