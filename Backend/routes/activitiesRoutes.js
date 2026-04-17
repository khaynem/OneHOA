const express = require("express");
const {
    getActivities,
    createActivity,
    updateActivity,
    uploadActivityPhoto,
} = require("../controllers/activitiesController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getActivities);
router.post("/", authMiddleware, createActivity);
router.put("/:id", authMiddleware, updateActivity);
router.post("/upload-photo", authMiddleware, uploadActivityPhoto);

module.exports = router;
