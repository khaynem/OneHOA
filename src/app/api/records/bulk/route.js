import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Address from "@/lib/server/models/address";
import "@/lib/server/models/pictures";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import {
  normalizeStatusInput,
  pickAllowedFields,
} from "@/lib/server/recordsHelpers";

export const runtime = "nodejs";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const resolveEntryYear = (entryDate) => {
  const parsed = entryDate ? new Date(entryDate) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
};

const resolveEntryMonth = (entryDate, fallbackMonth) => {
  if (fallbackMonth && MONTH_NAMES.includes(fallbackMonth)) {
    return fallbackMonth;
  }
  if (!entryDate) return "January";
  const parsed = new Date(entryDate);
  if (Number.isNaN(parsed.getTime())) return "January";
  return MONTH_NAMES[parsed.getMonth()] || "January";
};

const generateUniqueId = async (entryYear) => {
  const yearText = String(entryYear || new Date().getFullYear());
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${yearText}${suffix}`;
    const exists = await Record.findOne({ generated_id: candidate }).select("_id").lean();
    if (!exists) {
      return candidate;
    }
  }
  return `${yearText}${String(Date.now()).slice(-4)}`;
};

export async function POST(request) {
  let user;
  try {
    user = await requireAuth();
    requireRole(user, ["admin", "president", "secretary", "officer"]);
    await connectToDatabase();

    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "No record rows provided for bulk import." },
        { status: 400 }
      );
    }

    const createdRecords = [];
    const errors = [];

    // Pre-fetch existing addresses to optimize lookup
    const existingAddresses = await Address.find().lean();
    const addressMap = new Map(
      existingAddresses.map((addr) => [`${addr.phase}-${addr.block}-${addr.lot}`, addr._id])
    );

    for (let index = 0; index < rows.length; index += 1) {
      const rawRow = rows[index] || {};
      const rowNum = index + 1;

      // Extract raw inputs
      const lastName = String(rawRow.last_name || "").trim();
      const firstName = String(rawRow.first_name || "").trim();
      const middleName = String(rawRow.middle_name || "").trim();
      const rawPhase = String(rawRow.phase || "").trim();
      const rawBlock = String(rawRow.block || "").trim();
      const rawLot = String(rawRow.lot || "").trim();
      const phoneNumber = String(rawRow.phone_number || "").trim();
      const entryDateRaw = String(rawRow.entry_date || "").trim();
      const jobTitle = String(rawRow.job_title || "").trim();
      const workStatus = String(rawRow.work_status || "").trim();
      const occupantStatus = String(rawRow.occupant_status || "").trim();
      const rawStatus = rawRow.status;

      // Mandatory validation check according to requirements:
      // last_name, first_name, phase, block, lot, status
      const phaseNum = Number(rawPhase);
      const blockNum = Number(rawBlock);
      const lotNum = Number(rawLot);

      const missingFields = [];
      if (!lastName) missingFields.push("last_name");
      if (!firstName) missingFields.push("first_name");
      if (!rawPhase || ![1, 2, 3].includes(phaseNum)) missingFields.push("phase (1-3)");
      if (!rawBlock || Number.isNaN(blockNum)) missingFields.push("block");
      if (!rawLot || Number.isNaN(lotNum)) missingFields.push("lot");

      const normalizedStatus = normalizeStatusInput(rawStatus);
      if (!normalizedStatus || normalizedStatus.length === 0) {
        missingFields.push("status");
      }

      if (missingFields.length > 0) {
        errors.push({
          row: rowNum,
          name: `${firstName} ${lastName}`.trim() || `Row ${rowNum}`,
          message: `Missing or invalid required fields: ${missingFields.join(", ")}`,
        });
        continue;
      }

      try {
        // Resolve or create Address
        const addressKey = `${phaseNum}-${blockNum}-${lotNum}`;
        let addressId = addressMap.get(addressKey);

        if (!addressId) {
          const createdAddr = await Address.create({
            phase: phaseNum,
            block: blockNum,
            lot: lotNum,
          });
          addressId = createdAddr._id;
          addressMap.set(addressKey, addressId);
        }

        // Parse Entry Date if provided
        let entryDateValue = null;
        if (entryDateRaw) {
          const parsedDate = new Date(entryDateRaw);
          if (!Number.isNaN(parsedDate.getTime())) {
            entryDateValue = parsedDate;
          }
        }

        const entryYear = resolveEntryYear(entryDateValue);
        const entryMonth = resolveEntryMonth(entryDateValue, rawRow.entry_month);
        const generatedId = await generateUniqueId(entryYear);

        const payload = pickAllowedFields({
          last_name: lastName,
          first_name: firstName,
          middle_name: middleName || undefined,
          phone_number: phoneNumber || undefined,
          job_title: jobTitle || undefined,
          work_status: workStatus || undefined,
          occupant_status: occupantStatus || undefined,
          entry_date: entryDateValue,
          entry_month: entryMonth,
          status: normalizedStatus,
          "address._id": addressId,
        });

        payload.generated_id = generatedId;

        const recordDoc = await Record.create(payload);
        createdRecords.push(recordDoc);
      } catch (rowError) {
        errors.push({
          row: rowNum,
          name: `${firstName} ${lastName}`.trim() || `Row ${rowNum}`,
          message: rowError.message || "Failed to create homeowner record.",
        });
      }
    }

    if (createdRecords.length > 0) {
      try {
        await writeAuditLog({
          request,
          user,
          statusCode: 201,
          detailSummary: `Bulk imported ${createdRecords.length} homeowner record(s)`,
          metadata: {
            imported_count: createdRecords.length,
            error_count: errors.length,
          },
        });
      } catch (auditError) {
        console.error("Failed to write bulk import audit log:", auditError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        importedCount: createdRecords.length,
        errorCount: errors.length,
        errors,
      },
      message: `Bulk import completed. Successfully imported ${createdRecords.length} record(s) with ${errors.length} error(s).`,
    });
  } catch (error) {
    console.error("Failed to execute bulk import:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to execute bulk import." },
      { status: 500 }
    );
  }
}
