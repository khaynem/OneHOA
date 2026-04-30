const mongoose = require("mongoose");
const Record = require("../models/records");
const Address = require("../models/address");
const Picture = require("../models/pictures");
const { uploadImageDataUrl } = require("../services/cloudinaryService");

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
    "status"
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

function pickAllowedFields(payload = {}) {
    return Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => ALLOWED_FIELDS.includes(key) && value !== undefined)
    );
}

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function buildGeneratedId(record = {}) {
    const sourceDate = record.entry_date || record.createdAt || record.updatedAt || new Date();
    const parsedDate = new Date(sourceDate);
    const year = Number.isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear();

    const householdNumber = Number(record.household_no);
    if (!Number.isInteger(householdNumber) || householdNumber < 0) {
        return String(year);
    }

    return `${year}${String(householdNumber).padStart(4, "0")}`;
}

function normalizeStatusInput(statusInput) {
    if (Array.isArray(statusInput)) {
        return statusInput
            .map((status) => String(status || '').trim())
            .filter((status) => status.length > 0);
    }

    if (statusInput === undefined || statusInput === null) {
        return undefined;
    }

    const normalized = String(statusInput || '').trim();
    return normalized ? [normalized] : [];
}

function formatUpdatedFieldLabel(field) {
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

function formatHomeownerName(record = {}) {
    const firstName = String(record.first_name || '').trim();
    const lastName = String(record.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'homeowner';
}

function withGeneratedId(recordDoc) {
    if (!recordDoc) {
        return recordDoc;
    }

    const plainRecord = typeof recordDoc.toObject === "function" ? recordDoc.toObject() : recordDoc;
    return {
        ...plainRecord,
        generated_id: buildGeneratedId(plainRecord),
    };
}

function extractAddressPayload(payload = {}) {
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

    if (
        ![1, 2, 3].includes(normalizedPhase) ||
        Number.isNaN(normalizedBlock) ||
        Number.isNaN(normalizedLot)
    ) {
        throw new Error("Invalid address values. Phase must be 1, 2, or 3 and block/lot must be numbers.");
    }

    return {
        phase: normalizedPhase,
        block: normalizedBlock,
        lot: normalizedLot,
    };
}

async function resolveAddressIdFromPayload(body, existingAddressId = null) {
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

    if (existingAddressId && isValidObjectId(existingAddressId)) {
        await Address.findByIdAndUpdate(existingAddressId, addressPayload, {
            new: true,
            runValidators: true,
        });
        return existingAddressId;
    }

    const createdAddress = await Address.create(addressPayload);
    return createdAddress._id;
}

const uploadRecordPhoto = async (req, res) => {
    try {
        const { imageDataUrl, fileName, mimeType } = req.body || {};

        if (!imageDataUrl || typeof imageDataUrl !== "string") {
            return res.status(400).json({ success: false, message: "imageDataUrl is required." });
        }

        if (!imageDataUrl.startsWith("data:image/")) {
            return res.status(400).json({ success: false, message: "Only image uploads are allowed." });
        }

        const uploadResult = await uploadImageDataUrl(imageDataUrl);

        const picture = await Picture.create({
            filename: String(fileName || uploadResult.original_filename || uploadResult.public_id || "homeowner-photo"),
            path: uploadResult.secure_url,
            mime_type: String(mimeType || uploadResult.resource_type || "image"),
            uploaded_at: new Date(),
        });

        return res.status(201).json({ success: true, data: picture });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to upload homeowner photo.",
        });
    }
};

const updateRecordPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const { imageDataUrl, fileName, mimeType } = req.body || {};

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid record ID." });
        }

        if (!imageDataUrl || typeof imageDataUrl !== "string") {
            return res.status(400).json({ success: false, message: "imageDataUrl is required." });
        }

        if (!imageDataUrl.startsWith("data:image/")) {
            return res.status(400).json({ success: false, message: "Only image uploads are allowed." });
        }

        const existingRecord = await Record.findById(id);

        if (!existingRecord) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }

        const uploadResult = await uploadImageDataUrl(imageDataUrl);

        const picture = await Picture.create({
            filename: String(fileName || uploadResult.original_filename || uploadResult.public_id || "homeowner-photo"),
            path: uploadResult.secure_url,
            mime_type: String(mimeType || uploadResult.resource_type || "image"),
            uploaded_at: new Date(),
        });

        const updatedRecord = await Record.findByIdAndUpdate(
            id,
            { "pictures._id": picture._id },
            { new: true, runValidators: true }
        ).populate("address._id").populate("pictures._id");
        const updatedWithId = withGeneratedId(updatedRecord);
        const homeownerName = formatHomeownerName(updatedWithId);

        res.locals.auditDetails = {
            summary: `updated homeowner ${homeownerName}`,
            metadata: {
                record_id: String(updatedWithId._id || ''),
                generated_id: String(updatedWithId.generated_id || ''),
                homeowner_name: homeownerName,
                picture_id: String(picture._id || ''),
            },
        };

        return res.status(200).json({ success: true, data: updatedWithId });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update homeowner photo.",
        });
    }
};
const getRecords = async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();

        const filter = {};
        if (search){
            filter.$or = [
                { last_name: { $regex: search, $options: "i" } },
                { first_name: { $regex: search, $options: "i" } },
            ]
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

          return res.status(200).json({
           success: true,
              data: items.map((item) => withGeneratedId(item)),
           meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch records."
        });
    }
}

const getRecordById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid record ID." });
        }

        const record = await Record.findById(id).populate("address._id").populate("pictures._id");

        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }

        return res.status(200).json({ success: true, data: withGeneratedId(record) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch record."
        });
    }
}

const createRecord = async (req, res) => {
    try {
        const payload = pickAllowedFields(req.body);
        const normalizedStatus = normalizeStatusInput(payload.status ?? req.body.status);
        if (normalizedStatus !== undefined) {
            payload.status = normalizedStatus;
        }

        const resolvedAddressId = await resolveAddressIdFromPayload(req.body);
        if (resolvedAddressId) {
            payload["address._id"] = resolvedAddressId;
        }

        if (!payload.last_name || !payload.first_name) {
            return res.status(400).json({ success: false, message: "First name and last name are required." });
        }

        const newRecord = await Record.create(payload);
        const populatedRecord = await Record.findById(newRecord._id).populate("address._id").populate("pictures._id");
        const createdRecord = withGeneratedId(populatedRecord);
        const homeownerName = formatHomeownerName(createdRecord);

        res.locals.auditDetails = {
            summary: `registered homeowner ${homeownerName}`,
            metadata: {
                record_id: String(createdRecord._id || ''),
                generated_id: String(createdRecord.generated_id || ''),
                homeowner_name: homeownerName,
            },
        };

        return res.status(201).json({ success: true, data: createdRecord });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create record."
        });
    }
}   

const updateRecord = async (req, res) => {
    try{
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid record ID." });
        }

        const payload = pickAllowedFields(req.body);
        const normalizedStatus = normalizeStatusInput(payload.status ?? req.body.status);
        if (normalizedStatus !== undefined) {
            payload.status = normalizedStatus;
        }
        const existingRecord = await Record.findById(id);

        if (!existingRecord) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }

        const existingAddressId = existingRecord["address._id"] || null;

        const resolvedAddressId = await resolveAddressIdFromPayload(req.body, existingAddressId);
        if (resolvedAddressId) {
            payload["address._id"] = resolvedAddressId;
        }

        const updatedRecord = await Record.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        }).populate("address._id").populate("pictures._id");
        const updatedWithId = withGeneratedId(updatedRecord);
        const homeownerName = formatHomeownerName(updatedWithId);
        res.locals.auditDetails = {
            summary: `updated homeowner ${homeownerName}`,
            metadata: {
                record_id: String(updatedWithId._id || ''),
                generated_id: String(updatedWithId.generated_id || ''),
                homeowner_name: homeownerName,
            },
        };

        return res.status(200).json({ success: true, data: updatedWithId });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update record."
        });
    }
}

const deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid record ID." });
        }

        const deletedRecord = await Record.findByIdAndDelete(id);

        if (!deletedRecord) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }

        const generatedId = buildGeneratedId(deletedRecord);
        const homeownerName = formatHomeownerName(deletedRecord);
        res.locals.auditDetails = {
            summary: `deleted homeowner ${homeownerName} with generated ID ${generatedId}`,
            metadata: {
                record_id: String(deletedRecord._id || ''),
                generated_id: String(generatedId || ''),
                homeowner_name: homeownerName,
            },
        };

        return res.status(200).json({ success: true, message: "Record deleted successfully." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete record."
        });
    }
}

module.exports = {
    getRecords,
    getRecordById,
    createRecord,
    updateRecord,
    deleteRecord,
    uploadRecordPhoto,
    updateRecordPhoto,
};