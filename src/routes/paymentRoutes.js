const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, paymentController.getPayments);
router.get('/:id', protect, paymentController.getPaymentById);
router.post('/', protect, paymentController.createPayment);
router.delete('/:id', protect, paymentController.cancelPayment);

module.exports = router;
