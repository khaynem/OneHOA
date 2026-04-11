const mongoose = require("mongoose");
const Record = require("../models/records");
const Address = require("../models/address");

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

function pickAllowedFields(payload = {}) {
    return Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => ALLOWED_FIELDS.includes(key) && value !== undefined)
    );
}

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
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
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Record.countDocuments(filter),
        ]);

        return res.status(200).json({
           success: true,
           data: items,
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

        const record = await Record.findById(id).populate("address._id");

        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }

        return res.status(200).json({ success: true, data: record });
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

        const resolvedAddressId = await resolveAddressIdFromPayload(req.body);
        if (resolvedAddressId) {
            payload["address._id"] = resolvedAddressId;
        }

        if (!payload.last_name || !payload.first_name) {
            return res.status(400).json({ success: false, message: "First name and last name are required." });
        }

        const newRecord = await Record.create(payload);
        const populatedRecord = await Record.findById(newRecord._id).populate("address._id");
        return res.status(201).json({ success: true, data: populatedRecord });
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
        }).populate("address._id");

        return res.status(200).json({ success: true, data: updatedRecord });
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
};