import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Address from "@/lib/server/models/address";
import "@/lib/server/models/pictures";
import { requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import {
  extractAddressPayload,
  normalizeStatusInput,
  pickAllowedFields,
  resolveAddressIdFromPayload,
  withGeneratedId,
  formatHomeownerName,
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

export async function GET(request) {
  try {
    await requireAuth();
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.max(Number(searchParams.get("limit")) || 10, 1);
    const skip = (page - 1) * limit;
    const search = (searchParams.get("search") || "").trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { last_name: { $regex: search, $options: "i" } },
        { first_name: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Record.find(filter)
        .populate("address._id")
        .populate("pictures._id")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Record.countDocuments(filter),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: items.map((item) => withGeneratedId(item)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch records:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch records." },
      { status }
    );
  }
}

export async function POST(request) {
  let user;
  try {
    user = await requireAuth();
    await connectToDatabase();

    const body = await request.json();
    const payload = pickAllowedFields(body || {});
    const addressPayload = extractAddressPayload(body || {});
    const normalizedStatus = normalizeStatusInput(payload.status ?? body?.status);
    if (normalizedStatus !== undefined) {
      payload.status = normalizedStatus;
    }

    const resolvedAddressId = await resolveAddressIdFromPayload(body || {});
    if (resolvedAddressId) {
      payload["address._id"] = resolvedAddressId;
    }

    const occupantStatus = payload.occupant_status ?? body?.occupant_status;
    if (isOwnerOccupant(occupantStatus)) {
      const addressIds = await getAddressIdsForOwnerCheck({
        addressPayload,
        addressId: resolvedAddressId,
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
      }).select("_id");

      if (existingOwner) {
        return NextResponse.json(
          { success: false, message: "An owner already exists for this address." },
          { status: 409 }
        );
      }
    }

    if (!payload.last_name || !payload.first_name) {
      return NextResponse.json(
        { success: false, message: "First name and last name are required." },
        { status: 400 }
      );
    }

    const newRecord = await Record.create(payload);
    const populatedRecord = await Record.findById(newRecord._id)
      .populate("address._id")
      .populate("pictures._id");
    const createdRecord = withGeneratedId(populatedRecord);
    const homeownerName = formatHomeownerName(createdRecord);

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 201,
        detailSummary: `Registered homeowner ${homeownerName}`,
        metadata: {
          record_id: String(createdRecord._id || ""),
          generated_id: String(createdRecord.generated_id || ""),
          homeowner_name: homeownerName,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ success: true, data: createdRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create record." },
      { status: 500 }
    );
  }
}
