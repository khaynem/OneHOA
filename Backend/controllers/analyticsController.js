const Record = require("../models/records");
const Payment = require("../models/payments");
const Activity = require("../models/activities");

const PENDING_START_YEAR = 2026;
const PENDING_START_MONTH = 1;

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

function getCoveredPeriodsFromPayment(payment, startPeriod, endPeriod) {
	const coveredPeriods = Array.isArray(payment.payment_for_periods) && payment.payment_for_periods.length > 0
		? payment.payment_for_periods
		: [
			Number(payment.billing_period)
			|| ((Number(payment.billing_year) >= 2000 && Number(payment.billing_month) >= 1)
				? (Number(payment.billing_year) * 100) + Number(payment.billing_month)
				: null)
			|| dateToPeriod(payment.date)
			|| dateToPeriod(payment.createdAt),
		];

	return coveredPeriods
		.map((period) => Number(period))
		.filter((period) => Number.isInteger(period) && period >= startPeriod && period <= endPeriod);
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
		const monthStart = new Date();
		monthStart.setDate(1);
		monthStart.setHours(0, 0, 0, 0);

		const nextMonthStart = new Date(monthStart);
		nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

		const currentMonth = monthStart.getMonth() + 1;
		const currentYear = monthStart.getFullYear();
		const currentPeriod = (currentYear * 100) + currentMonth;

		const pendingStartDate = new Date(PENDING_START_YEAR, PENDING_START_MONTH - 1, 1);
		const pendingStartPeriod = (PENDING_START_YEAR * 100) + PENDING_START_MONTH;
		const trackedMonths = ((currentYear - PENDING_START_YEAR) * 12) + (currentMonth - PENDING_START_MONTH) + 1;

		const [
			homeowners,
			trackedPayments,
			recentPaymentsRaw,
			previousActivitiesRaw,
		] = await Promise.all([
			Record.find()
				.select("_id")
				.lean(),
			Payment.find({
				$or: [
					{ payment_for_periods: { $elemMatch: { $gte: pendingStartPeriod, $lte: currentPeriod } } },
					{ billing_period: { $gte: pendingStartPeriod, $lte: currentPeriod } },
					{
						billing_year: { $gte: PENDING_START_YEAR, $lte: currentYear },
						billing_month: { $gte: 1, $lte: 12 },
					},
					{
						createdAt: { $gte: pendingStartDate, $lt: nextMonthStart },
						$or: [
							{ billing_period: { $exists: false } },
							{ billing_year: { $exists: false } },
							{ billing_month: { $exists: false } },
						],
					},
				],
				"records._id": { $exists: true, $ne: null },
			})
				.select("records._id payment_for_periods billing_period billing_year billing_month payment_status payment_details payment_method date createdAt")
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

			const coveredPeriods = getCoveredPeriodsFromPayment(payment, pendingStartPeriod, currentPeriod);
			if (coveredPeriods.length === 0) {
				continue;
			}

			if (!paidPeriodsByHomeowner.has(homeownerId)) {
				paidPeriodsByHomeowner.set(homeownerId, new Set());
			}

			for (const period of coveredPeriods) {
				paidPeriodsByHomeowner.get(homeownerId).add(period);
			}
		}

		let upcomingPayments = 0;
		let pendingPayments = 0;

		for (const homeowner of homeowners) {
			const homeownerId = String(homeowner._id);
			const activeStartPeriod = pendingStartPeriod;

			if (activeStartPeriod > currentPeriod) {
				continue;
			}

			const paidSet = paidPeriodsByHomeowner.get(homeownerId) || new Set();

			if (!paidSet.has(currentPeriod)) {
				upcomingPayments += 1;
			}

			let periodCursor = activeStartPeriod;
			while (periodCursor < currentPeriod) {
				if (!paidSet.has(periodCursor)) {
					pendingPayments += 1;
				}
				periodCursor = nextPeriod(periodCursor);
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
				trackedMonths,
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
