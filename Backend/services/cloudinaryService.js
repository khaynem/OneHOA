const { v2: cloudinary } = require("cloudinary");

function configureCloudinary() {
    if (process.env.CLOUDINARY_URL) {
        cloudinary.config({
            cloudinary_url: process.env.CLOUDINARY_URL,
        });
        return;
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

configureCloudinary();

function ensureCloudinaryConfig() {
    const hasUrl = Boolean(process.env.CLOUDINARY_URL);
    const hasSplitKeys = Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

    if (!hasUrl && !hasSplitKeys) {
        throw new Error("Cloudinary configuration is incomplete. Provide CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.");
    }
}

async function uploadImageDataUrl(imageDataUrl, options = {}) {
    ensureCloudinaryConfig();

    const uploadResult = await cloudinary.uploader.upload(imageDataUrl, {
        folder: process.env.CLOUDINARY_FOLDER || "onehoa/homeowners",
        resource_type: "image",
        ...options,
    });

    return uploadResult;
}

module.exports = {
    uploadImageDataUrl,
};
