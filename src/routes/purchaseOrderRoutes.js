const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  getNextOrderNumber,
  updatePurchaseOrder,
  deletePurchaseOrder,
  addPurchaseOrderReturn,
} = require('../controllers/purchaseOrderController');

const router = express.Router();

router.post('/', protect, createPurchaseOrder);
router.get('/next-order-number', protect, getNextOrderNumber);
router.get('/', protect, getPurchaseOrders);
router.get('/:id', protect, getPurchaseOrderById);
router.post('/:id/returns', protect, addPurchaseOrderReturn);
router.put('/:id', protect, updatePurchaseOrder);
router.delete('/:id', protect, deletePurchaseOrder);

module.exports = router;
