const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        phase: {
            type: Number,
            required: true,
        },
        block: {
            type: Number,
            required: true,
        },
        lot: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'addresses',
    }
);

module.exports = mongoose.model('Address', addressSchema);