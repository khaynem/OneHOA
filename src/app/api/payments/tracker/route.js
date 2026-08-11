import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Payment from "@/lib/server/models/payments";
import Record from "@/lib/server/models/records";
import { requireAuth } from "@/lib/server/auth";
import { getCoveredPeriodsFromPayment, inferPaymentStatus } from "@/lib/server/paymentsHelpers";

export const runtime = "nodejs";

const MIN_TRACKING_PERIOD = 202601; // Constant system baseline: January 2026

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const resolveHomeownerEntryPeriod = (record) => {
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
};

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
      .select("_id first_name last_name household_no entry_date entry_month occupant_status address._id")
      .populate("address._id", "phase block lot")
      .sort({ last_name: 1, first_name: 1 })
      .lean();

    // Group records by Address
    const addressMap = new Map();

    for (const record of records) {
      const addrObj = record.address?._id || record["address._id"];
      let addressKey = "";
      let unitNumber = "-";

      if (addrObj && typeof addrObj === "object" && addrObj._id) {
        addressKey = String(addrObj._id);
        if (addrObj.phase !== undefined && addrObj.block !== undefined && addrObj.lot !== undefined) {
          unitNumber = `${addrObj.phase}-${addrObj.block}-${addrObj.lot}`;
        }
      } else if (record.household_no) {
        addressKey = `household_${record.household_no}`;
        unitNumber = `Household #${record.household_no}`;
      } else {
        addressKey = `record_${record._id}`;
      }

      if (!addressMap.has(addressKey)) {
        addressMap.set(addressKey, {
          key: addressKey,
          addressId: addrObj?._id ? String(addrObj._id) : null,
          unitNumber,
          records: [],
          oldestEntryPeriod: 999999,
          recordIdsSet: new Set(),
        });
      }

      const group = addressMap.get(addressKey);
      group.records.push(record);
      group.recordIdsSet.add(String(record._id));

      const recordEntryPeriod = resolveHomeownerEntryPeriod(record);
      if (recordEntryPeriod < group.oldestEntryPeriod) {
        group.oldestEntryPeriod = recordEntryPeriod;
      }
    }

    const recordToAddressKey = new Map();
    for (const [addressKey, group] of addressMap.entries()) {
      if (group.oldestEntryPeriod === 999999) {
        group.oldestEntryPeriod = MIN_TRACKING_PERIOD;
      }
      for (const recId of group.recordIdsSet) {
        recordToAddressKey.set(recId, addressKey);
      }
    }

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

    const addressMonthStatus = new Map();

    for (const payment of payments) {
      const homeownerId = payment.records && payment.records._id ? String(payment.records._id) : null;
      if (!homeownerId) {
        continue;
      }

      const addressKey = recordToAddressKey.get(homeownerId);
      if (!addressKey) {
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

        const compositeKey = `${addressKey}:${monthKey}`;
        const current = addressMonthStatus.get(compositeKey);

        if (current !== "paid") {
          addressMonthStatus.set(compositeKey, status);
        }
      }
    }

    const homeowners = Array.from(addressMap.values()).map((group) => {
      // Pick primary homeowner (owner or first record)
      const primaryOwnerRecord = group.records.find(
        (r) => String(r.occupant_status || "").trim().toLowerCase() === "owner"
      ) || group.records[0];

      const names = group.records
        .map((r) => `${r.first_name || ""} ${r.last_name || ""}`.trim())
        .filter(Boolean);
      const displayName = names.length > 1 ? names.join(", ") : (names[0] || "Unknown");

      const entryPeriod = group.oldestEntryPeriod;

      const monthly_status = months.map((monthInfo) => {
        const currentPeriod = monthInfo.year * 100 + monthInfo.month;
        const lookupKey = `${group.key}:${monthInfo.key}`;
        const recordedStatus = addressMonthStatus.get(lookupKey);

        let finalStatus = "unpaid";
        if (recordedStatus) {
          finalStatus = recordedStatus;
        } else if (currentPeriod < MIN_TRACKING_PERIOD || currentPeriod < entryPeriod) {
          finalStatus = "N/A";
        }

        return {
          month: monthInfo.month,
          year: monthInfo.year,
          label: monthInfo.label,
          status: finalStatus,
        };
      });

      const paidMonths = monthly_status.filter((entry) => entry.status === "paid").length;
      const unpaidMonths = monthly_status.filter((entry) => entry.status === "unpaid").length;
      const currentMonth = monthly_status[monthly_status.length - 1] || null;

      return {
        id: String(primaryOwnerRecord._id),
        address_id: group.addressId,
        unit_number: group.unitNumber,
        homeowner: displayName,
        household_no: primaryOwnerRecord.household_no,
        record_ids: Array.from(group.recordIdsSet),
        oldest_entry_period: entryPeriod,
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
