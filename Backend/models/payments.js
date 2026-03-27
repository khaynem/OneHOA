const mongoose = require('mongoose');

const paymentsSchema = new mongoose.Schema(
    {
        receipt_no: {
            type: Number,
            required: true,
            unique: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        payment_method: {
            type: String,
            required: true,
            trim: true,
        },
        payment_details: {
            type: String,
            trim: true,
        },
        'records._id': {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Record',
        }
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'payments',
    }
);

paymentsSchema.index({ receipt_no: 1 }, { unique: true });
paymentsSchema.index({ 'records._id': 1 });

module.exports = mongoose.model('Payment', paymentsSchema);