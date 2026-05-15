import mongoose from "mongoose";
import Address from "./models/address";

const ALLOWED_FIELDS = [
  "last_name",
  "first_name",
  "phone_number",
  "job_description",
  "work_address",
  "work_status",
  "entry_date",
  "occupant_status",
  "household_no",
  "loan_availed",
  "address._id",
  "pictures._id",
  "status",
];

const FIELD_LABELS = {
  last_name: "Last Name",
  first_name: "First Name",
  phone_number: "Phone Number",
  job_description: "Job Description",
  work_address: "Work Address",
  work_status: "Work Status",
  entry_date: "Entry Date",
  occupant_status: "Occupant Status",
  household_no: "Household No",
  loan_availed: "Loan Availed",
  "address._id": "Address",
  "pictures._id": "Photo",
  status: "Status",
};

export function pickAllowedFields(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key, value]) => ALLOWED_FIELDS.includes(key) && value !== undefined
    )
  );
}

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export function buildGeneratedId(record = {}) {
  const sourceDate = record.entry_date || record.createdAt || record.updatedAt || new Date();
  const parsedDate = new Date(sourceDate);
  const year = Number.isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear();

  const householdNumber = Number(record.household_no);
  if (!Number.isInteger(householdNumber) || householdNumber < 0) {
    return String(year);
  }

  return `${year}${String(householdNumber).padStart(4, "0")}`;
}

export function normalizeStatusInput(statusInput) {
  if (Array.isArray(statusInput)) {
    return statusInput
      .map((status) => String(status || "").trim())
      .filter((status) => status.length > 0);
  }

  if (statusInput === undefined || statusInput === null) {
    return undefined;
  }

  const normalized = String(statusInput || "").trim();
  return normalized ? [normalized] : [];
}

export function formatUpdatedFieldLabel(field) {
  if (FIELD_LABELS[field]) {
    return FIELD_LABELS[field];
  }

  const normalized = String(field || "").replace(/\._id$/, "");
  return normalized
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatHomeownerName(record = {}) {
  const firstName = String(record.first_name || "").trim();
  const lastName = String(record.last_name || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || "homeowner";
}

export function withGeneratedId(recordDoc) {
  if (!recordDoc) {
    return recordDoc;
  }

  const plainRecord = typeof recordDoc.toObject === "function" ? recordDoc.toObject() : recordDoc;
  return {
    ...plainRecord,
    generated_id: buildGeneratedId(plainRecord),
  };
}

export function extractAddressPayload(payload = {}) {
  if (!payload.address || typeof payload.address !== "object") {
    return null;
  }

  const { phase, block, lot } = payload.address;

  if (phase === undefined && block === undefined && lot === undefined) {
    return null;
  }

  if (phase === undefined || block === undefined || lot === undefined) {
    throw new Error("Address phase, block, and lot are required when address is provided.");
  }

  const normalizedPhase = Number(phase);
  const normalizedBlock = Number(block);
  const normalizedLot = Number(lot);

  if (![1, 2, 3].includes(normalizedPhase) || Number.isNaN(normalizedBlock) || Number.isNaN(normalizedLot)) {
    throw new Error("Invalid address values. Phase must be 1, 2, or 3 and block/lot must be numbers.");
  }

  return {
    phase: normalizedPhase,
    block: normalizedBlock,
    lot: normalizedLot,
  };
}

export async function resolveAddressIdFromPayload(body, existingAddressId = null) {
  const directAddressId = body["address._id"];

  if (directAddressId !== undefined) {
    if (!isValidObjectId(directAddressId)) {
      throw new Error("Invalid address ID.");
    }
    return directAddressId;
  }

  const addressPayload = extractAddressPayload(body);
  if (!addressPayload) {
    return null;
  }

  const existingAddress = await Address.findOne(addressPayload).select("_id");
  if (existingAddress) {
    return existingAddress._id;
  }

  const createdAddress = await Address.create(addressPayload);
  return createdAddress._id;
}
