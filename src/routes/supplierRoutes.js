const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger,
  exportSuppliersToExcel,
  importSuppliersFromExcel,
} = require('../controllers/supplierController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, createSupplier);
router.post('/import-excel', protect, upload.single('file'), importSuppliersFromExcel);
router.get('/export-excel', protect, exportSuppliersToExcel);
router.get('/', protect, getSuppliers);
router.get('/:id/ledger', protect, getSupplierLedger);
router.put('/:id', protect, updateSupplier);
router.delete('/:id', protect, deleteSupplier);

module.exports = router;
