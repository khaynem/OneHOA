const express = require("express");
const {
    getRecords,
    getRecordById,
    createRecord,
    updateRecord,
    deleteRecord,
    uploadRecordPhoto,
    updateRecordPhoto
} = require("../controllers/recordsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/upload-photo", authMiddleware, uploadRecordPhoto);
router.post("/:id/photo", authMiddleware, updateRecordPhoto);
router.get("/", authMiddleware, getRecords);
router.get("/:id", authMiddleware, getRecordById);
router.post("/", authMiddleware, createRecord);
router.put("/:id", authMiddleware, updateRecord);
router.delete("/:id", authMiddleware, deleteRecord);

module.exports = router;