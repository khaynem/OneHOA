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

function formatDisplayDate(dateValue) {
	if (!dateValue) {
		return "";
	}

	const parsed = new Date(dateValue);
	if (Number.isNaN(parsed.getTime())) {
		return "";
	}

	return parsed.toLocaleDateString("en-PH", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

const getDashboardAnalytics = async (req, res) => {
	try {
		const [
			totalHomeowners,
			pendingPayments,
			upcomingPayments,
			recentPaymentsRaw,
			previousActivitiesRaw,
		] = await Promise.all([
			Record.countDocuments(),
			Payment.countDocuments({
				$or: [
					{ payment_details: { $regex: "pending", $options: "i" } },
					{ payment_method: { $regex: "pending", $options: "i" } },
				],
			}),
			Payment.countDocuments({
				date: { $gte: new Date() },
			}),
			Payment.find()
				.populate("records._id", "first_name last_name household_no")
				.sort({ date: -1, createdAt: -1 })
				.limit(5),
			Activity.find()
				.sort({ createdAt: -1 })
				.limit(5),
		]);

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
				date: payment.date,
			};
		});

		const previousActivities = previousActivitiesRaw.map((activity) => ({
			id: activity._id,
			title: activity.title,
			date: formatDisplayDate(activity.createdAt),
		}));

		return res.status(200).json({
			success: true,
			data: {
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
