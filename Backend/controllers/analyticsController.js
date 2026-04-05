const Record = require("../models/records");
const Payment = require("../models/payments");
const Activity = require("../models/activities");

function formatPaymentAmount(amount) {
	const value = Number(amount) || 0;
	return `P${value.toLocaleString("en-PH", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function dateToPeriod(dateInput) {
	const dateValue = new Date(dateInput);
	if (Number.isNaN(dateValue.getTime())) {
		return null;
	}

	return (dateValue.getFullYear() * 100) + (dateValue.getMonth() + 1);
}

function normalizePaymentPeriod(payment) {
	if (Number(payment.billing_period)) {
		return Number(payment.billing_period);
	}

	const month = Number(payment.billing_month);
	const year = Number(payment.billing_year);
	if (month >= 1 && month <= 12 && year >= 2000 && year <= 3000) {
		return (year * 100) + month;
	}

	return dateToPeriod(payment.createdAt);
}

function isPaymentMarkedPaid(payment) {
	if (payment.payment_status === "paid") {
		return true;
	}

	if (payment.payment_status === "unpaid") {
		return false;
	}

	const statusText = `${payment.payment_details || ""} ${payment.payment_method || ""}`;
	return !/unpaid/i.test(statusText);
}

function nextPeriod(period) {
	const year = Math.floor(period / 100);
	const month = period % 100;
	if (month === 12) {
		return ((year + 1) * 100) + 1;
	}

	return (year * 100) + (month + 1);
}

const getDashboardAnalytics = async (req, res) => {
	try {
		const requestedMonths = Number(req.query.months) || 12;
		const monthsToTrack = Math.min(Math.max(requestedMonths, 1), 36);

		const monthStart = new Date();
		monthStart.setDate(1);
		monthStart.setHours(0, 0, 0, 0);

		const nextMonthStart = new Date(monthStart);
		nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

		const currentMonth = monthStart.getMonth() + 1;
		const currentYear = monthStart.getFullYear();
		const currentPeriod = (currentYear * 100) + currentMonth;

		const trackerStartDate = new Date(monthStart);
		trackerStartDate.setMonth(trackerStartDate.getMonth() - (monthsToTrack - 1));
		const trackerStartPeriod = (trackerStartDate.getFullYear() * 100) + (trackerStartDate.getMonth() + 1);

		const [
			homeowners,
			trackedPayments,
			recentPaymentsRaw,
			previousActivitiesRaw,
		] = await Promise.all([
			Record.find()
				.select("_id entry_date")
				.lean(),
			Payment.find({
				$or: [
					{ billing_period: { $gte: trackerStartPeriod, $lte: currentPeriod } },
					{
						billing_year: { $gte: Math.floor(trackerStartPeriod / 100), $lte: currentYear },
						billing_month: { $gte: 1, $lte: 12 },
					},
					{
						createdAt: { $gte: trackerStartDate, $lt: nextMonthStart },
						$or: [
							{ billing_period: { $exists: false } },
							{ billing_year: { $exists: false } },
							{ billing_month: { $exists: false } },
						],
					},
				],
				"records._id": { $exists: true, $ne: null },
			})
				.select("records._id billing_period billing_year billing_month payment_status payment_details payment_method createdAt")
				.lean(),
			Payment.find()
				.populate("records._id", "first_name last_name household_no")
				.sort({ createdAt: -1 })
				.limit(5),
			Activity.find()
				.sort({ createdAt: -1 })
				.limit(5),
		]);

		const paidPeriodsByHomeowner = new Map();

		for (const payment of trackedPayments) {
			const homeownerId = payment.records && payment.records._id ? String(payment.records._id) : null;
			if (!homeownerId || !isPaymentMarkedPaid(payment)) {
				continue;
			}

			const period = normalizePaymentPeriod(payment);
			if (!period || period < trackerStartPeriod || period > currentPeriod) {
				continue;
			}

			if (!paidPeriodsByHomeowner.has(homeownerId)) {
				paidPeriodsByHomeowner.set(homeownerId, new Set());
			}

			paidPeriodsByHomeowner.get(homeownerId).add(period);
		}

		let upcomingPayments = 0;
		let pendingPayments = 0;

		for (const homeowner of homeowners) {
			const homeownerId = String(homeowner._id);
			const entryPeriod = dateToPeriod(homeowner.entry_date);
			const activeStartPeriod = entryPeriod ? Math.max(entryPeriod, trackerStartPeriod) : trackerStartPeriod;

			if (activeStartPeriod > currentPeriod) {
				continue;
			}

			const paidSet = paidPeriodsByHomeowner.get(homeownerId) || new Set();

			if (!paidSet.has(currentPeriod)) {
				upcomingPayments += 1;
			}

			let hasPastDue = false;
			let periodCursor = activeStartPeriod;
			while (periodCursor < currentPeriod) {
				if (!paidSet.has(periodCursor)) {
					hasPastDue = true;
					break;
				}
				periodCursor = nextPeriod(periodCursor);
			}

			if (hasPastDue) {
				pendingPayments += 1;
			}
		}

		const totalHomeowners = homeowners.length;

		const recentPayments = recentPaymentsRaw.map((payment) => {
			const homeownerRecord = payment.records && payment.records._id ? payment.records._id : null;
			const homeownerName = homeownerRecord
				? `${homeownerRecord.first_name || ""} ${homeownerRecord.last_name || ""}`.trim()
				: "Unlinked Homeowner";

			const householdText = homeownerRecord && homeownerRecord.household_no !== undefined
				? `#${homeownerRecord.household_no}`
				: "";

			return {
				id: payment._id,
				homeowner: householdText ? `${homeownerName} (${householdText})` : homeownerName,
				details: payment.payment_details || payment.payment_method || "Payment",
				amount: formatPaymentAmount(payment.amount),
				date: payment.createdAt,
			};
		});

		const previousActivities = previousActivitiesRaw.map((activity) => ({
			id: activity._id,
			title: activity.title,
			date: activity.date,
		}));

		return res.status(200).json({
			success: true,
			data: {
				trackedMonths: monthsToTrack,
				stats: {
					totalHomeowners,
					pendingPayments,
					upcomingPayments,
				},
				recentPayments,
				previousActivities,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: "Failed to load dashboard analytics.",
		});
	}
};

module.exports = {
	getDashboardAnalytics,
};
