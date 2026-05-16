import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Address from "@/lib/server/models/address";
import "@/lib/server/models/pictures";
import { requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import {
  buildGeneratedId,
  extractAddressPayload,
  formatHomeownerName,
  isValidObjectId,
  normalizeStatusInput,
  pickAllowedFields,
  resolveAddressIdFromPayload,
  withGeneratedId,
} from "@/lib/server/recordsHelpers";

export const runtime = "nodejs";

const normalizeOccupantStatus = (value) => String(value || "").trim().toLowerCase();

const isOwnerOccupant = (value) => normalizeOccupantStatus(value) === "owner";

const getAddressIdsForOwnerCheck = async ({ addressPayload, addressId }) => {
  let resolvedPayload = addressPayload;

  if (!resolvedPayload && addressId) {
    const existingAddress = await Address.findById(addressId).select("phase block lot").lean();
    if (existingAddress) {
      resolvedPayload = {
        phase: existingAddress.phase,
        block: existingAddress.block,
        lot: existingAddress.lot,
      };
    }
  }

  if (!resolvedPayload) {
    return [];
  }

  const addresses = await Address.find(resolvedPayload).select("_id").lean();
  return addresses.map((address) => address._id);
};

const resolveEntryYear = (entryDate) => {
  const parsed = entryDate ? new Date(entryDate) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
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

export async function GET(request, { params }) {
  try {
    await requireAuth();
    await connectToDatabase();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid record ID." }, { status: 400 });
    }

    const record = await Record.findById(id).populate("address._id").populate("pictures._id");
    if (!record) {
      return NextResponse.json({ success: false, message: "Record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: withGeneratedId(record) }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch record." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  let user;
  try {
    user = await requireAuth();
    await connectToDatabase();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid record ID." }, { status: 400 });
    }

    const body = await request.json();
    const payload = pickAllowedFields(body || {});
    const addressPayload = extractAddressPayload(body || {});
    const normalizedStatus = normalizeStatusInput(payload.status ?? body?.status);
    if (normalizedStatus !== undefined) {
      payload.status = normalizedStatus;
    }

    if (payload.archived !== undefined) {
      payload.archived = Boolean(payload.archived);
      payload.archived_at = payload.archived ? new Date() : null;
    } else if (payload.archived_at !== undefined) {
      delete payload.archived_at;
    }

    const existingRecord = await Record.findById(id);
    if (!existingRecord) {
      return NextResponse.json({ success: false, message: "Record not found." }, { status: 404 });
    }

    const existingAddressId = existingRecord["address._id"] || null;
    const resolvedAddressId = await resolveAddressIdFromPayload(body || {}, existingAddressId);
    if (resolvedAddressId) {
      payload["address._id"] = resolvedAddressId;
    }

    const nextOccupantStatus = payload.occupant_status ?? existingRecord.occupant_status;
    if (isOwnerOccupant(nextOccupantStatus)) {
      const addressIds = await getAddressIdsForOwnerCheck({
        addressPayload,
        addressId: resolvedAddressId || existingAddressId,
      });

      if (addressIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "Owner records require a valid address." },
          { status: 400 }
        );
      }

      const existingOwner = await Record.findOne({
        "address._id": { $in: addressIds },
        occupant_status: { $regex: /^owner$/i },
        _id: { $ne: existingRecord._id },
      }).select("_id");

      if (existingOwner) {
        return NextResponse.json(
          { success: false, message: "An owner already exists for this address." },
          { status: 409 }
        );
      }
    }

    if (!existingRecord.generated_id) {
      const entryYear = resolveEntryYear(payload.entry_date ?? existingRecord.entry_date);
      payload.generated_id = await generateUniqueId(entryYear);
    }

    const updatedRecord = await Record.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("address._id")
      .populate("pictures._id");

    const updatedWithId = withGeneratedId(updatedRecord);
    const homeownerName = formatHomeownerName(updatedWithId);

    try {
      if (payload.archived !== undefined) {
        await writeAuditLog({
          request,
          user,
          statusCode: 200,
          detailSummary: `${payload.archived ? "Archived" : "Unarchived"} homeowner ${homeownerName}`,
          metadata: {
            record_id: String(updatedWithId._id || ""),
            generated_id: String(updatedWithId.generated_id || ""),
            homeowner_name: homeownerName,
            archived: payload.archived,
          },
        });
      }

      await writeAuditLog({
        request,
        user,
        statusCode: 200,
        detailSummary: `Updated homeowner ${homeownerName}`,
        metadata: {
          record_id: String(updatedWithId._id || ""),
          generated_id: String(updatedWithId.generated_id || ""),
          homeowner_name: homeownerName,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ success: true, data: updatedWithId }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update record." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  let user;
  try {
    user = await requireAuth();
    await connectToDatabase();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid record ID." }, { status: 400 });
    }

    const existingRecord = await Record.findById(id);
    if (!existingRecord) {
      return NextResponse.json({ success: false, message: "Record not found." }, { status: 404 });
    }

    if (!existingRecord.archived) {
      return NextResponse.json(
        { success: false, message: "Record must be archived before deletion." },
        { status: 409 }
      );
    }

    const deletedRecord = await Record.findByIdAndDelete(id);
    if (!deletedRecord) {
      return NextResponse.json({ success: false, message: "Record not found." }, { status: 404 });
    }

    const generatedId = buildGeneratedId(deletedRecord);
    const homeownerName = formatHomeownerName(deletedRecord);

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 200,
        detailSummary: `Deleted homeowner ${homeownerName} with generated ID ${generatedId}`,
        metadata: {
          record_id: String(deletedRecord._id || ""),
          generated_id: String(generatedId || ""),
          homeowner_name: homeownerName,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json(
      { success: true, message: "Record deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete record." },
      { status: 500 }
    );
  }
}
