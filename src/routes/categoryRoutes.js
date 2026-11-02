const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const {
  createCategory,
  getCategorys,
  updateCategory,
  deleteCategory,
  exportCategoriesToExcel,
  importCategoriesFromExcel,
} = require('../controllers/categoryController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, createCategory);
router.post('/import-excel', protect, upload.single('file'), importCategoriesFromExcel);
router.get('/export-excel', protect, exportCategoriesToExcel);
router.get('/', protect, getCategorys);
router.put('/:id', protect, updateCategory);
router.delete('/:id', protect, deleteCategory);

module.exports = router;
