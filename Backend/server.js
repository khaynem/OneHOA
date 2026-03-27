const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

async function connectToMongoDB() {
	if (!MONGODB_URI) {
		throw new Error("MONGODB_URI is missing in .env");
	}

	await mongoose.connect(MONGODB_URI, {
		serverSelectionTimeoutMS: 10000,
	});
	console.log("MongoDB connected successfully.");
}

async function startServer() {
	try {
		await connectToMongoDB();

		const server = app.listen(PORT, () => {
			console.log(`Server is running on http://localhost:${PORT}`);
			console.log(`Health check: http://localhost:${PORT}/api/health`);
		});

		const shutdown = async (signal) => {
			console.log(`${signal} received. Closing server and DB connection...`);

			server.close(async () => {
				try {
					await mongoose.connection.close();
					console.log("MongoDB connection closed.");
					process.exit(0);
				} catch (error) {
					console.error("Error while closing MongoDB connection:", error.message);
					process.exit(1);
				}
			});
		};

		process.on("SIGINT", () => shutdown("SIGINT"));
		process.on("SIGTERM", () => shutdown("SIGTERM"));
	} catch (error) {
		console.error("Failed to start server:", error.message);
		process.exit(1);
	}
}

startServer();
