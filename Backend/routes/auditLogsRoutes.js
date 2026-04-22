const express = require('express');
const { getAuditLogs } = require('../controllers/auditLogsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(authMiddleware.requireRole('president'));

router.get('/', getAuditLogs);

module.exports = router;
