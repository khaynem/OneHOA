const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getDashboardAnalytics } = require("../controllers/analyticsController");

const router = express.Router();

router.get("/dashboard", authMiddleware, getDashboardAnalytics);

module.exports = router;
