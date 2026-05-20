import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/server/db";
import Payment from "@/lib/server/models/payments";
import Record from "@/lib/server/models/records";
import { requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import {
  getBillingMonthAndYear,
  inferPaymentStatus,
  normalizePaymentForPeriods,
  parsePaymentForEntry,
  formatPeriodLabel,
} from "@/lib/server/paymentsHelpers";

export const runtime = "nodejs";

const EXCLUDED_OCCUPANT_STATUSES = new Set(["renter", "relative", "caretaker"]);

export async function POST(request) {
  let user;
  try {
    user = await requireAuth();
    await connectToDatabase();

    const body = await request.json();
    const {
      receipt_no,
      amount,
      date,
      payment_method,
      payment_details,
      record_id,
      recordId,
      payment_status,
      billing_month,
      billing_year,
      payment_for,
      payment_for_periods,
    } = body || {};

    const normalizedPaymentMethod = String(payment_method || "Cash").trim();
    const selectedRecordId = record_id || recordId;

    if (!receipt_no || !amount || !date || !selectedRecordId) {
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(selectedRecordId)) {
      return NextResponse.json({ message: "Invalid record_id format." }, { status: 400 });
    }

    const billingInfo = getBillingMonthAndYear(date, billing_month, billing_year);
    if (!billingInfo) {
      return NextResponse.json(
        { message: "Invalid date, billing_month, or billing_year." },
        { status: 400 }
      );
    }

    const coveredPeriods = normalizePaymentForPeriods(
      payment_for_periods ?? payment_for,
      billingInfo.billingPeriod
    );

    if (!coveredPeriods) {
      return NextResponse.json(
        { message: "Invalid payment_for format. Use YYYYMM, YYYY-MM, or { year, month } values." },
        { status: 400 }
      );
    }

    const record = await Record.findById(selectedRecordId).select(
      "_id first_name last_name household_no occupant_status"
    );
    if (!record) {
      return NextResponse.json({ message: "Record not found." }, { status: 404 });
    }

    const normalizedOccupantStatus = String(record.occupant_status || "").trim().toLowerCase();
    if (EXCLUDED_OCCUPANT_STATUSES.has(normalizedOccupantStatus)) {
      return NextResponse.json(
        { message: "Payments are not tracked for this occupant status." },
        { status: 400 }
      );
    }

    const existingPaidForSamePeriods = await Payment.findOne({
      "records._id": record._id,
      payment_status: "paid",
      $or: [
        { payment_for_periods: { $in: coveredPeriods } },
        { payment_for_periods: { $size: 0 }, billing_period: { $in: coveredPeriods } },
        { payment_for_periods: { $exists: false }, billing_period: { $in: coveredPeriods } },
      ],
    })
      .select("payment_for_periods billing_period")
      .lean();

    if (existingPaidForSamePeriods) {
      const existingCoveredPeriods =
        Array.isArray(existingPaidForSamePeriods.payment_for_periods) &&
        existingPaidForSamePeriods.payment_for_periods.length > 0
          ? existingPaidForSamePeriods.payment_for_periods.map(Number)
          : [Number(existingPaidForSamePeriods.billing_period)].filter((value) => Number.isInteger(value));

      const duplicatePeriods = coveredPeriods.filter((period) => existingCoveredPeriods.includes(period));

      return NextResponse.json(
        {
          message: `The homeowner has already made a payment for the period(s): ${formatPeriodLabel(duplicatePeriods)}.`,
        },
        { status: 409 }
      );
    }

    const newPayment = new Payment({
      receipt_no,
      amount,
      date: billingInfo.parsedDate,
      billing_month: billingInfo.billingMonth,
      billing_year: billingInfo.billingYear,
      billing_period: billingInfo.billingPeriod,
      payment_for_periods: coveredPeriods,
      payment_status: inferPaymentStatus(payment_status, payment_details, normalizedPaymentMethod),
      payment_method: normalizedPaymentMethod,
      payment_details,
      "records._id": record._id,
    });

    await newPayment.save();

    const homeownerName = `${record.first_name || ""} ${record.last_name || ""}`.trim() || "homeowner";
    const periodLabel = formatPeriodLabel(coveredPeriods);

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 201,
        detailSummary: `Added receipt ${receipt_no} for ${homeownerName} covering ${periodLabel}`,
        metadata: {
          payment_id: String(newPayment._id || ""),
          receipt_no: String(receipt_no || ""),
          record_id: String(record._id || ""),
          homeowner_name: homeownerName,
          payment_periods: coveredPeriods,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json(
      { message: "Payment created successfully.", payment: newPayment },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ message: "Receipt number already exists." }, { status: 409 });
    }

    console.error("Error creating payment:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the payment." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await requireAuth();
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const record_id = searchParams.get("record_id");
    const billing_month = searchParams.get("billing_month");
    const billing_year = searchParams.get("billing_year");
    const payment_status = searchParams.get("payment_status");
    const payment_for_period = searchParams.get("payment_for_period");

    const filter = {};

    if (record_id) {
      if (!mongoose.Types.ObjectId.isValid(record_id)) {
        return NextResponse.json({ message: "Invalid record_id format." }, { status: 400 });
      }
      filter["records._id"] = record_id;
    }

    if (billing_month) {
      filter.billing_month = Number(billing_month);
    }

    if (billing_year) {
      filter.billing_year = Number(billing_year);
    }

    if (payment_status) {
      filter.payment_status = String(payment_status).toLowerCase();
    }

    if (payment_for_period) {
      const period = parsePaymentForEntry(payment_for_period);
      if (!period) {
        return NextResponse.json({ message: "Invalid payment_for_period format." }, { status: 400 });
      }
      filter.payment_for_periods = period;
    }

    const payments = await Payment.find(filter)
      .populate("records._id", "first_name last_name")
      .sort({ billing_year: -1, billing_month: -1, date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: payments }, { status: 200 });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching payments." },
      { status: 500 }
    );
  }
}
