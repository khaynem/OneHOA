const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(
	cors({
		origin: clientOrigin,
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());

//Routes
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
	res.status(200).json({
		ok: true,
		message: "Backend is running",
		timestamp: new Date().toISOString(),
	});
});

module.exports = app;
