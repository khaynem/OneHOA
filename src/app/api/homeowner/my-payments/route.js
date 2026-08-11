import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Payment from "@/lib/server/models/payments";
import Setting from "@/lib/server/models/settings";
import "@/lib/server/models/users";
import "@/lib/server/models/address";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

const MIN_TRACKING_PERIOD = 202601;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatPeriod(periodNum) {
  if (!periodNum) return "-";
  const num = Number(periodNum);
  if (!Number.isInteger(num)) return String(periodNum);

  const year = Math.floor(num / 100);
  const month = num % 100;
  if (month >= 1 && month <= 12) {
    return `${MONTH_NAMES[month - 1]} ${year}`;
  }
  return String(periodNum);
}

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

export async function GET(request) {
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
        .lean();
    }

    if (!record && user.first_name && user.last_name) {
      record = await Record.findOne({
        first_name: { $regex: new RegExp(`^${user.first_name.trim()}$`, "i") },
        last_name: { $regex: new RegExp(`^${user.last_name.trim()}$`, "i") },
      })
        .populate("address._id")
        .lean();
    }

    // Fallback for testing
    if (!record) {
      record = await Record.findOne({ archived: { $ne: true } })
        .populate("address._id")
        .lean();
    }

    // Fetch monthly dues setting
    const duesSetting = await Setting.findOne({ key: "monthly_dues" }).lean();
    const monthlyDues = Number(duesSetting?.value) > 0 ? Number(duesSetting.value) : 100;

    if (!record) {
      return NextResponse.json(
        {
          success: true,
          payments: [],
          stats: {
            totalAmountPaid: 0,
            totalReceipts: 0,
            monthlyDues,
            outstandingBalance: 0,
            pendingMonthsCount: 0,
            pendingPeriodLabels: [],
            isCurrentMonthPaid: true,
            currentMonthLabel: `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`,
            currentPeriod: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
            statusLabel: "Up to Date",
            warningLevel: "none",
          },
        },
        { status: 200 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const yearFilter = searchParams.get("year");
    const searchFilter = (searchParams.get("search") || "").trim();

    const query = { "records._id": record._id };

    if (yearFilter && !Number.isNaN(Number(yearFilter))) {
      query.billing_year = Number(yearFilter);
    }

    if (searchFilter) {
      const isNum = !Number.isNaN(Number(searchFilter));
      if (isNum) {
        query.$or = [
          { receipt_no: Number(searchFilter) },
          { payment_method: { $regex: searchFilter, $options: "i" } },
          { payment_details: { $regex: searchFilter, $options: "i" } },
        ];
      } else {
        query.$or = [
          { payment_method: { $regex: searchFilter, $options: "i" } },
          { payment_details: { $regex: searchFilter, $options: "i" } },
        ];
      }
    }

    const rawPayments = await Payment.find(query)
      .populate("recorded_by", "first_name last_name role email")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    let totalAmountPaid = 0;
    const paidPeriodSet = new Set();

    const formattedPayments = rawPayments.map((p) => {
      const amount = p.amount || 0;
      const status = String(p.payment_status || "paid").toLowerCase();
      if (status === "paid") {
        totalAmountPaid += amount;

        if (Array.isArray(p.payment_for_periods) && p.payment_for_periods.length > 0) {
          p.payment_for_periods.forEach((per) => paidPeriodSet.add(Number(per)));
        } else if (p.billing_period) {
          paidPeriodSet.add(Number(p.billing_period));
        } else if (p.billing_month && p.billing_year) {
          paidPeriodSet.add(p.billing_year * 100 + p.billing_month);
        }
      }

      let periodsFormatted = [];
      if (Array.isArray(p.payment_for_periods) && p.payment_for_periods.length > 0) {
        periodsFormatted = p.payment_for_periods.map((per) => formatPeriod(per));
      } else if (p.billing_period) {
        periodsFormatted = [formatPeriod(p.billing_period)];
      } else if (p.billing_month && p.billing_year) {
        periodsFormatted = [`${MONTH_NAMES[p.billing_month - 1]} ${p.billing_year}`];
      }

      return {
        id: p._id.toString(),
        receipt_no: p.receipt_no,
        amount,
        date: p.date,
        billing_month: p.billing_month,
        billing_year: p.billing_year,
        billing_period: p.billing_period,
        payment_for_periods: p.payment_for_periods || [],
        periodsLabel: periodsFormatted.join(", "),
        payment_status: status,
        payment_method: p.payment_method || "N/A",
        payment_details: p.payment_details || "",
        recorded_by: p.recorded_by
          ? `${p.recorded_by.first_name || ""} ${p.recorded_by.last_name || ""}`.trim() || p.recorded_by.email
          : "HOA System",
        createdAt: p.createdAt,
      };
    });

    // Calculate balance and payment warnings
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentPeriod = currentYear * 100 + currentMonth;
    const currentMonthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

    const entryPeriod = resolveHomeownerEntryPeriod(record);
    const eligiblePeriods = generateEligiblePeriods(entryPeriod, currentPeriod);

    const pendingPeriods = eligiblePeriods.filter((item) => !paidPeriodSet.has(item.period));
    const pendingMonthsCount = pendingPeriods.length;
    const outstandingBalance = pendingMonthsCount * monthlyDues;
    const isCurrentMonthPaid = paidPeriodSet.has(currentPeriod);
    const pendingPeriodLabels = pendingPeriods.map((p) => p.label);

    let statusLabel = "Up to Date";
    if (pendingMonthsCount > 0) {
      statusLabel = isCurrentMonthPaid ? "Past Dues Pending" : "Payment Due";
    }

    let warningLevel = "none";
    if (pendingMonthsCount > 2) {
      warningLevel = "high";
    } else if (pendingMonthsCount > 0) {
      warningLevel = "medium";
    }

    return NextResponse.json(
      {
        success: true,
        record: {
          id: record._id.toString(),
          first_name: record.first_name,
          last_name: record.last_name,
          generated_id: record.generated_id,
          email: record.email,
          phone_number: record.phone_number,
          phase: record.address?._id?.phase ?? record.address?.phase ?? null,
          block: record.address?._id?.block ?? record.address?.block ?? null,
          lot: record.address?._id?.lot ?? record.address?.lot ?? null,
          unit_number: record.address?._id?.unit_number ?? record.address?.unit_number ?? null,
        },
        payments: formattedPayments,
        stats: {
          totalAmountPaid,
          totalReceipts: formattedPayments.length,
          monthlyDues,
          outstandingBalance,
          pendingMonthsCount,
          pendingPeriodLabels,
          isCurrentMonthPaid,
          currentMonthLabel,
          currentPeriod,
          statusLabel,
          warningLevel,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Homeowner Payments API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load homeowner payments." },
      { status: error.status || 500 }
    );
  }
}

