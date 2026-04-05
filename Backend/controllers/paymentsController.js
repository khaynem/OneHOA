const mongoose = require('mongoose');
const Payment = require('../models/payments');
const Record = require('../models/records');

function inferPaymentStatus(paymentStatus, paymentDetails, paymentMethod) {
    if (paymentStatus && ['paid', 'unpaid'].includes(String(paymentStatus).toLowerCase())) {
        return String(paymentStatus).toLowerCase();
    }

    const statusText = `${paymentDetails || ''} ${paymentMethod || ''}`;
    return /unpaid/i.test(statusText) ? 'unpaid' : 'paid';
}

function getBillingMonthAndYear(dateInput, billingMonthInput, billingYearInput) {
    const parsedDate = new Date(dateInput);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    const billingMonth = Number(billingMonthInput) || parsedDate.getMonth() + 1;
    const billingYear = Number(billingYearInput) || parsedDate.getFullYear();

    if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
        return null;
    }

    if (!Number.isInteger(billingYear) || billingYear < 2000 || billingYear > 3000) {
        return null;
    }

    return {
        parsedDate,
        billingMonth,
        billingYear,
        billingPeriod: (billingYear * 100) + billingMonth,
    };
}

const createPayment = async (req, res) => {
    try {
        const {
            receipt_no,
            amount,
            date,
            payment_method,
            payment_details,
            record_id,
            recordId,
            payment_status,
            billing_month,
            billing_year,
        } = req.body;

        const selectedRecordId = record_id || recordId;

        if (!receipt_no || !amount || !date || !payment_method || !selectedRecordId) {
            return res.status(400).json({
                message: 'Missing required fields.',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(selectedRecordId)) {
            return res.status(400).json({ message: 'Invalid record_id format.' });
        }

        const billingInfo = getBillingMonthAndYear(date, billing_month, billing_year);
        if (!billingInfo) {
            return res.status(400).json({
                message: 'Invalid date, billing_month, or billing_year.',
            });
        }

        const record = await Record.findById(selectedRecordId).select('_id');
        if (!record) {
            return res.status(404).json({ message: 'Record not found.' });
        }

        const newPayment = new Payment({
            receipt_no,
            amount,
            date: billingInfo.parsedDate,
            billing_month: billingInfo.billingMonth,
            billing_year: billingInfo.billingYear,
            billing_period: billingInfo.billingPeriod,
            payment_status: inferPaymentStatus(payment_status, payment_details, payment_method),
            payment_method,
            payment_details,
            'records._id': record._id,
        });

        await newPayment.save();

        res.status(201).json({ message: 'Payment created successfully.', payment: newPayment });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Receipt number already exists.' });
        }

        console.error('Error creating payment:', error);
        res.status(500).json({ message: 'An error occurred while creating the payment.' });
    }
};

const getPayments = async (req, res) => {
    try {
        const { record_id, billing_month, billing_year, payment_status } = req.query;
        const filter = {};

        if (record_id) {
            if (!mongoose.Types.ObjectId.isValid(record_id)) {
                return res.status(400).json({ message: 'Invalid record_id format.' });
            }
            filter['records._id'] = record_id;
        }

        if (billing_month) {
            filter.billing_month = Number(billing_month);
        }

        if (billing_year) {
            filter.billing_year = Number(billing_year);
        }

        if (payment_status) {
            filter.payment_status = String(payment_status).toLowerCase();
        }

        const payments = await Payment.find(filter)
            .populate('records._id', 'first_name last_name household_no')
            .sort({ billing_year: -1, billing_month: -1, date: -1, createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: payments,
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return res.status(500).json({ message: 'An error occurred while fetching payments.' });
    }
};

const getPaymentTracker = async (req, res) => {
    try {
        const now = new Date();
        const requestedMonths = Number(req.query.months) || 12;
        const monthsToTrack = Math.min(Math.max(requestedMonths, 1), 36);

        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const startDate = new Date(currentMonthStart);
        startDate.setMonth(startDate.getMonth() - (monthsToTrack - 1));
        const startPeriod = (startDate.getFullYear() * 100) + (startDate.getMonth() + 1);
        const endPeriod = (currentMonthStart.getFullYear() * 100) + (currentMonthStart.getMonth() + 1);

        const endExclusive = new Date(currentMonthStart);
        endExclusive.setMonth(endExclusive.getMonth() + 1);

        const months = [];
        const monthKeySet = new Set();

        for (let i = 0; i < monthsToTrack; i += 1) {
            const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
            const month = d.getMonth() + 1;
            const year = d.getFullYear();
            const key = `${year}-${String(month).padStart(2, '0')}`;

            months.push({
                key,
                month,
                year,
                label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
            });
            monthKeySet.add(key);
        }

        const records = await Record.find()
            .select('_id first_name last_name household_no')
            .sort({ last_name: 1, first_name: 1 })
            .lean();

        const payments = await Payment.find({
            $or: [
                { billing_period: { $gte: startPeriod, $lte: endPeriod } },
                {
                    date: { $gte: startDate, $lt: endExclusive },
                    $or: [
                        { billing_period: { $exists: false } },
                        { billing_year: { $exists: false } },
                        { billing_month: { $exists: false } },
                    ],
                },
            ],
            'records._id': { $exists: true, $ne: null },
        })
            .select('records._id date billing_month billing_year payment_status payment_details payment_method')
            .lean();

        const homeownerMonthStatus = new Map();

        for (const payment of payments) {
            const homeownerId = payment.records && payment.records._id ? String(payment.records._id) : null;
            if (!homeownerId) {
                continue;
            }

            const paymentDate = payment.date ? new Date(payment.date) : null;
            if (!paymentDate || Number.isNaN(paymentDate.getTime())) {
                continue;
            }

            const month = Number(payment.billing_month) || paymentDate.getMonth() + 1;
            const year = Number(payment.billing_year) || paymentDate.getFullYear();
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;

            if (!monthKeySet.has(monthKey)) {
                continue;
            }

            const status = inferPaymentStatus(payment.payment_status, payment.payment_details, payment.payment_method);
            const compositeKey = `${homeownerId}:${monthKey}`;
            const current = homeownerMonthStatus.get(compositeKey);

            if (current !== 'paid') {
                homeownerMonthStatus.set(compositeKey, status);
            }
        }

        const homeowners = records.map((record) => {
            const homeownerId = String(record._id);

            const monthly_status = months.map((monthInfo) => {
                const lookupKey = `${homeownerId}:${monthInfo.key}`;
                return {
                    month: monthInfo.month,
                    year: monthInfo.year,
                    label: monthInfo.label,
                    status: homeownerMonthStatus.get(lookupKey) || 'unpaid',
                };
            });

            const paidMonths = monthly_status.filter((entry) => entry.status === 'paid').length;
            const unpaidMonths = monthly_status.length - paidMonths;
            const currentMonth = monthly_status[monthly_status.length - 1] || null;

            return {
                id: homeownerId,
                homeowner: `${record.first_name || ''} ${record.last_name || ''}`.trim(),
                household_no: record.household_no,
                monthly_status,
                summary: {
                    paidMonths,
                    unpaidMonths,
                    currentMonthStatus: currentMonth ? currentMonth.status : 'unpaid',
                    pastDueMonths: Math.max(unpaidMonths - (currentMonth && currentMonth.status === 'unpaid' ? 1 : 0), 0),
                },
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                trackedMonths: monthsToTrack,
                period: {
                    start: startDate,
                    endExclusive,
                },
                homeowners,
            },
        });
    } catch (error) {
        console.error('Error loading payment tracker:', error);
        return res.status(500).json({ message: 'An error occurred while loading payment tracker.' });
    }
};

const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid payment id format.' });
        }

        const payment = await Payment.findById(id)
            .populate('records._id', 'first_name last_name household_no')
            .lean();

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found.' });
        }

        return res.status(200).json({ success: true, data: payment });
    } catch (error) {
        console.error('Error fetching payment:', error);
        return res.status(500).json({ message: 'An error occurred while fetching the payment.' });
    }
};

const updatePayment = async (req, res) => {
    return res.status(501).json({ message: 'Update payment is not implemented yet.' });
};

const deletePayment = async (req, res) => {
    return res.status(501).json({ message: 'Delete payment is not implemented yet.' });
};

module.exports = {
    createPayment,
    getPayments,
    getPaymentTracker,
    getPaymentById,
    updatePayment,
    deletePayment
};