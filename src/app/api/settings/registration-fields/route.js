import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Setting from "@/lib/server/models/settings";
import { requireAuth, requireRole } from "@/lib/server/auth";

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

export async function GET() {
  try {
    await connectToDatabase();

    const setting = await Setting.findOne({ key: SETTING_KEY }).lean();
    let fields = normalizeRegistrationFields(setting?.value || DEFAULT_REGISTRATION_FIELDS);

    if (!fields.find(f => f.key === "email")) {
      const emailField = DEFAULT_REGISTRATION_FIELDS.find(f => f.key === "email");
      fields = [
        ...fields.slice(0, 3),
        emailField,
        ...fields.slice(3)
      ];
    }

    return NextResponse.json({ success: true, fields }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load registration fields." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  let user;
  try {
    user = await requireAuth();
    requireRole(user, ["admin", "president"]);
    await connectToDatabase();

    const body = await request.json();
    const { fields } = body || {};

    if (!Array.isArray(fields)) {
      return NextResponse.json(
        { success: false, message: "Fields must be an array." },
        { status: 400 }
      );
    }

    const setting = await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      { value: normalizeRegistrationFields(fields) },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({ success: true, fields: setting.value }, { status: 200 });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update registration fields." },
      { status }
    );
  }
}
