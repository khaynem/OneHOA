const mongoose = require('mongoose');

const picturesSchema = new mongoose.Schema(
    {
        filename: {
            type: String,
            required: true,
            trim: true,
        },
        path: {
            type: String,
            required: true,
            trim: true,
        },
        mime_type: {
            type: String,
            required: true,
            trim: true,
        },
        uploaded_at: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'pictures',
    }
);

module.exports = mongoose.model('Picture', picturesSchema);