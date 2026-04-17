const mongoose = require("mongoose");
const Activity = require("../models/activities");
const Picture = require("../models/pictures");
const { uploadImageDataUrl } = require("../services/cloudinaryService");

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

const getActivities = async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate("pictures._id")
            .populate("users._id", "email role")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ success: true, data: activities });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Failed to fetch activities." });
    }
};

const createActivity = async (req, res) => {
    try {
        const { title, content, date, "pictures._id": pictureId } = req.body || {};

        if (!String(title || "").trim()) {
            return res.status(400).json({ success: false, message: "Activity title is required." });
        }

        const payload = {
            title: String(title).trim(),
            content: String(content || "").trim(),
            date: date ? new Date(date) : new Date(),
        };

        if (pictureId) {
            if (!isValidObjectId(pictureId)) {
                return res.status(400).json({ success: false, message: "Invalid picture id." });
            }
            payload["pictures._id"] = pictureId;
        }

        if (req.user && req.user.id && isValidObjectId(req.user.id)) {
            payload["users._id"] = req.user.id;
        }

        const created = await Activity.create(payload);
        const populated = await Activity.findById(created._id)
            .populate("pictures._id")
            .populate("users._id", "email role");

        return res.status(201).json({ success: true, data: populated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Failed to create activity." });
    }
};

const updateActivity = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid activity ID." });
        }

        const { title, content, date, "pictures._id": pictureId } = req.body || {};

        const payload = {};

        if (title !== undefined) {
            if (!String(title).trim()) {
                return res.status(400).json({ success: false, message: "Activity title cannot be empty." });
            }
            payload.title = String(title).trim();
        }

        if (content !== undefined) {
            payload.content = String(content || "").trim();
        }

        if (date !== undefined) {
            payload.date = date ? new Date(date) : null;
        }

        if (pictureId !== undefined) {
            if (pictureId && !isValidObjectId(pictureId)) {
                return res.status(400).json({ success: false, message: "Invalid picture id." });
            }
            payload["pictures._id"] = pictureId || null;
        }

        const updated = await Activity.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        })
            .populate("pictures._id")
            .populate("users._id", "email role");

        if (!updated) {
            return res.status(404).json({ success: false, message: "Activity not found." });
        }

        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Failed to update activity." });
    }
};

const uploadActivityPhoto = async (req, res) => {
    try {
        const { imageDataUrl, fileName, mimeType } = req.body || {};

        if (!imageDataUrl || typeof imageDataUrl !== "string") {
            return res.status(400).json({ success: false, message: "imageDataUrl is required." });
        }

        if (!imageDataUrl.startsWith("data:image/")) {
            return res.status(400).json({ success: false, message: "Only image uploads are allowed." });
        }

        const uploadResult = await uploadImageDataUrl(imageDataUrl, {
            folder: process.env.CLOUDINARY_ACTIVITY_FOLDER || process.env.CLOUDINARY_FOLDER || "onehoa/activities",
        });

        const picture = await Picture.create({
            filename: String(fileName || uploadResult.original_filename || uploadResult.public_id || "activity-photo"),
            path: uploadResult.secure_url,
            mime_type: String(mimeType || uploadResult.resource_type || "image"),
            uploaded_at: new Date(),
        });

        return res.status(201).json({ success: true, data: picture });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || "Failed to upload activity photo." });
    }
};

module.exports = {
    getActivities,
    createActivity,
    updateActivity,
    uploadActivityPhoto,
};
