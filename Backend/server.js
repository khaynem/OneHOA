const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_MAX_RETRIES = Number(process.env.MONGO_MAX_RETRIES || 8);
const MONGO_RETRY_DELAY_MS = Number(process.env.MONGO_RETRY_DELAY_MS || 3000);

async function connectToMongoDB() {
	if (!MONGODB_URI) {
		throw new Error("MONGODB_URI is missing in .env");
	}

	await mongoose.connect(MONGODB_URI, {
		serverSelectionTimeoutMS: 10000,
	});
	console.log("MongoDB connected successfully.");
}

async function connectToMongoDBWithRetry() {
	for (let attempt = 1; attempt <= MONGO_MAX_RETRIES; attempt += 1) {
		try {
			await connectToMongoDB();
			return;
		} catch (error) {
			const isLastAttempt = attempt === MONGO_MAX_RETRIES;
			console.error(
				`MongoDB connection attempt ${attempt}/${MONGO_MAX_RETRIES} failed: ${error.message}`
			);

			if (isLastAttempt) {
				console.error(
					"Final MongoDB connection attempt failed. Check Atlas IP allowlist, credentials, and internet connection."
				);
				throw error;
			}

			await new Promise((resolve) => setTimeout(resolve, MONGO_RETRY_DELAY_MS));
		}
	}
}

async function startServer() {
	try {
		await connectToMongoDBWithRetry();

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