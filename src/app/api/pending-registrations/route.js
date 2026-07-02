import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import PendingRegistration from "@/lib/server/models/pendingRegistrations";
import Setting from "@/lib/server/models/settings";
import "@/lib/server/models/pictures";
import { requireAuth, requireRole } from "@/lib/server/auth";
import mongoose from "mongoose";

export const runtime = "nodejs";

const SETTING_KEY = "registration_fields";
const WORK_STATUS_OPTIONS = ["Contractual", "Regular", "Self-Employed", "Freelance", "Unemployed", "Other"];

const DEFAULT_REGISTRATION_FIELDS = [
  { key: "first_name", label: "First Name", type: "text", required: true, isActive: true },
  { key: "middle_name", label: "Middle Name", type: "text", required: true, isActive: true },
  { key: "last_name", label: "Last Name", type: "text", required: true, isActive: true },
  { key: "email", label: "Email Address", type: "email", required: true, isActive: true },
  { key: "phone_number", label: "Phone Number (11 digits)", type: "tel", required: true, isActive: true },
  { key: "job_title", label: "Job Title", type: "text", required: true, isActive: true },
  {
    key: "work_status",
    label: "Work Status",
    type: "select",
    options: WORK_STATUS_OPTIONS,
    required: true,
    isActive: true,
  },
  { key: "phase", label: "Phase (1-3)", type: "select", options: ["1", "2", "3"], required: true, isActive: true },
  { key: "block", label: "Block", type: "number", required: true, isActive: true },
  { key: "lot", label: "Lot", type: "number", required: true, isActive: true },
  { key: "entry_date", label: "Entry Year", type: "number", required: true, isActive: true },
  {
    key: "occupant_status",
    label: "Occupant Status",
    type: "select",
    options: ["Owner", "Relative", "Renter", "Caretaker"],
    required: true,
    isActive: true,
  },
  { key: "household_members", label: "Household Members", type: "household_list", required: true, isActive: true },
];

const normalizeRegistrationFields = (fields = []) => {
  if (!Array.isArray(fields)) {
    return DEFAULT_REGISTRATION_FIELDS
  }

  return fields.map((field) => {
    if (field?.key !== "work_status") {
      return field
    }

    return {
      ...field,
      options: WORK_STATUS_OPTIONS,
    }
  })
};

export async function GET(request) {
  try {
    const user = await requireAuth();
    requireRole(user, ["admin", "president"]);
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get("status") || "";

    const filter = {};
    if (statusFilter) {
      filter.status = statusFilter;
    }

    const items = await PendingRegistration.find(filter)
      .populate("picture_id")
      .populate("valid_id_picture_ids")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load pending registrations." },
      { status }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();

    // 1. Fetch form field config
    const setting = await Setting.findOne({ key: SETTING_KEY }).lean();
    let fieldsConfig = normalizeRegistrationFields(setting?.value || DEFAULT_REGISTRATION_FIELDS);

    if (!fieldsConfig.find(f => f.key === "email")) {
      const emailField = DEFAULT_REGISTRATION_FIELDS.find(f => f.key === "email") || { key: "email", label: "Email Address", type: "email", required: true, isActive: true };
      fieldsConfig = [
        ...fieldsConfig.slice(0, 3),
        emailField,
        ...fieldsConfig.slice(3)
      ];
    }

    // 2. Build registration payload and validate required active fields
    const payload = {};
    for (const field of fieldsConfig) {
      if (field.isActive) {
        const val = body[field.key];
        let isPresent = false;
        if (field.type === "household_list") {
          isPresent = Array.isArray(val) && val.length > 0;
        } else {
          isPresent = val !== undefined && val !== null && String(val).trim() !== "";
        }

        if (field.required && !isPresent) {
          return NextResponse.json(
            { success: false, message: `Field "${field.label}" is required.` },
            { status: 400 }
          );
        }

        if (isPresent) {
          const stringVal = String(val).trim();
          if (field.key === "phase" || field.key === "block" || field.key === "lot") {
            const num = Number(stringVal);
            if (Number.isNaN(num) || num <= 0) {
              return NextResponse.json(
                { success: false, message: `Field "${field.label}" must be a valid positive number.` },
                { status: 400 }
              );
            }
            payload[field.key] = num;
          } else if (field.key === "entry_date") {
            const year = Number(stringVal);
            const currentYear = new Date().getFullYear();
            if (Number.isNaN(year) || year < 1900 || year > currentYear) {
              return NextResponse.json(
                { success: false, message: `Entry year must be between 1900 and ${currentYear}.` },
                { status: 400 }
              );
            }
            // convert entry year to Date object (Jan 1 of that year)
            payload.entry_date = new Date(year, 0, 1);
          } else if (field.key === "phone_number") {
            const digits = stringVal.replace(/\D/g, "");
            if (digits.length !== 11) {
              return NextResponse.json(
                { success: false, message: "Phone number must be exactly 11 digits." },
                { status: 400 }
              );
            }
            payload.phone_number = digits;
          } else if (field.type === "household_list") {
            payload[field.key] = val;
          } else {
            payload[field.key] = stringVal;
          }
        }
      }
    }

    // 3. Validate files
    const validIdPictureIds = body.valid_id_picture_ids;
    if (!Array.isArray(validIdPictureIds) || validIdPictureIds.length === 0 || validIdPictureIds.length > 4) {
      return NextResponse.json(
        { success: false, message: "Valid ID upload is required (1 to 4 images)." },
        { status: 400 }
      );
    }
    for (const id of validIdPictureIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: "Invalid ID picture reference." },
          { status: 400 }
        );
      }
    }
    payload.valid_id_picture_ids = validIdPictureIds;

    const pictureId = body.picture_id;
    if (!pictureId || !mongoose.Types.ObjectId.isValid(pictureId)) {
      return NextResponse.json(
        { success: false, message: "Profile photo upload is required." },
        { status: 400 }
      );
    }
    payload.picture_id = pictureId;

    // 4. Create Pending Registration Record
    const newReg = await PendingRegistration.create(payload);

    return NextResponse.json({ success: true, data: newReg }, { status: 201 });
  } catch (error) {
    console.error("Guest registration failed:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit registration request." },
      { status: 500 }
    );
  }
}
