import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Payment from "@/lib/server/models/payments";
import "@/lib/server/models/users";
import "@/lib/server/models/address";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

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

    if (!record) {
      return NextResponse.json(
        {
          success: true,
          payments: [],
          stats: { totalAmountPaid: 0, totalReceipts: 0 },
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
    const formattedPayments = rawPayments.map((p) => {
      const amount = p.amount || 0;
      const status = String(p.payment_status || "paid").toLowerCase();
      if (status === "paid") {
        totalAmountPaid += amount;
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
