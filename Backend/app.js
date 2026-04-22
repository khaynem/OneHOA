const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const recordsRoutes = require("./routes/recordsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const paymentsRoutes = require("./routes/paymentsRoutes");
const activitiesRoutes = require("./routes/activitiesRoutes");
const usersRoutes = require("./routes/usersRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const auditLogsRoutes = require("./routes/auditLogsRoutes");
const { auditOfficerActivity } = require("./middleware/auditMiddleware");

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(
	cors({
		origin: clientOrigin,
		credentials: true,
	})
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(auditOfficerActivity());

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/records", recordsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

app.get("/api/health", (req, res) => {
	res.status(200).json({
		ok: true,
		message: "Backend is running",
		timestamp: new Date().toISOString(),
	});
});

module.exports = app;
