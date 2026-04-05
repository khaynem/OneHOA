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
        billing_year: {
            type: Number,
            required: true,
            min: 2000,
            max: 3000,
        },
        billing_month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        billing_period: {
            type: Number,
            required: true,
            min: 200001,
            max: 300012,
        },
        payment_status: {
            type: String,
            required: true,
            enum: ['paid', 'unpaid'],
            default: 'paid',
            trim: true,
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

paymentsSchema.index({ 'records._id': 1 });
paymentsSchema.index({ 'records._id': 1, billing_year: 1, billing_month: 1 });
paymentsSchema.index({ payment_status: 1, billing_year: 1, billing_month: 1 });
paymentsSchema.index({ 'records._id': 1, billing_period: 1 });
paymentsSchema.index({ payment_status: 1, billing_period: 1 });

module.exports = mongoose.model('Payment', paymentsSchema);