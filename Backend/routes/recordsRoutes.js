const express = require("express");
const {
    getRecords,
    getRecordById,
    createRecord,
    updateRecord,
    deleteRecord
} = require("../controllers/recordsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getRecords);
router.get("/:id", authMiddleware, getRecordById);
router.post("/", authMiddleware, createRecord);
router.put("/:id", authMiddleware, updateRecord);
router.delete("/:id", authMiddleware, deleteRecord);

module.exports = router;