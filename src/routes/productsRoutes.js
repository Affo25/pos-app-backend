const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const {
  createProducts,
  getProductss,
  updateProducts,
  deleteProducts,
  getStockReport,
  importProductsFromExcel,
} = require('../controllers/productsController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', protect, createProducts);
router.post('/import-excel', protect, upload.single('file'), importProductsFromExcel);
router.get('/', protect, getProductss);
router.get('/stock-report', protect, getStockReport);
router.put('/:id', protect, updateProducts);
router.delete('/:id', protect, deleteProducts);

module.exports = router;
