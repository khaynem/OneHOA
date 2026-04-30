const mongoose = require('mongoose');

const recordsSchema = new mongoose.Schema(
    {
        last_name: {
            type: String,
            required: true,
            trim: true,
        },
        first_name: {
            type: String,
            required: true,
            trim: true,
        },
        phone_number: {
            type: String,
            trim: true,
        },
        job_description: {
            type: String,
            trim: true,
        },
        work_address: {
            type: String,
            trim: true,
        },
        work_status: {
            type: String,
            trim: true,
        },
        entry_date: {
            type: Date,
        },
        occupant_status: {
            type: String,
            trim: true,
        },
        household_no: {
            type: Number,
        },
        loan_availed:{
            type: String,
            trim: true,
        },
        'address._id': {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Address',
        },
        'pictures._id': {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Picture',
        },
        status: {
            type: [String],
            default: [],
        }
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'records',
    },
);
recordsSchema.index({ 'address._id': 1 }, { unique: true });

module.exports = mongoose.model('Record', recordsSchema);
