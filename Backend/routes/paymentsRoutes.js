const express = require('express');
const {
    createPayment,
    getPayments,
    getPaymentTracker,
    getPaymentById,
    updatePayment,
    deletePayment
} = require('../controllers/paymentsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createPayment);
router.get('/', authMiddleware, getPayments);
router.get('/tracker', authMiddleware, getPaymentTracker);
router.get('/:id', authMiddleware, getPaymentById);
router.put('/:id', authMiddleware, updatePayment);
router.delete('/:id', authMiddleware, deletePayment);

module.exports = router;