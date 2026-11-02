const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomerLedger,
  exportCustomersToExcel,
  importCustomersFromExcel,
} = require('../controllers/customerController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, createCustomer);
router.post('/import-excel', protect, upload.single('file'), importCustomersFromExcel);
router.get('/export-excel', protect, exportCustomersToExcel);
router.get('/', protect, getCustomers);
router.get('/:id/ledger', protect, getCustomerLedger);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, deleteCustomer);

module.exports = router;
