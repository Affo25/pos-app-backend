const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  createSale,
  getSales,
  updateSale,
  deleteSale,
  createBilling,
  getInvoiceById,
  getNextInvoiceNumber,
} = require('../controllers/saleController');

const router = express.Router();

router.post('/', protect, createSale);
router.post('/billing', protect, createBilling);
router.get('/next-invoice-number', protect, getNextInvoiceNumber);
router.get('/', protect, getSales);
router.get('/invoice/:id', protect, getInvoiceById);
router.put('/:id', protect, updateSale);
router.delete('/:id', protect, deleteSale);

module.exports = router;
