const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const {
  createSubCategory,
  getSubCategorys,
  updateSubCategory,
  deleteSubCategory,
  exportSubCategoriesToExcel,
  importSubCategoriesFromExcel,
} = require('../controllers/subCategoryController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, createSubCategory);
router.post('/import-excel', protect, upload.single('file'), importSubCategoriesFromExcel);
router.get('/export-excel', protect, exportSubCategoriesToExcel);
router.get('/', protect, getSubCategorys);
router.put('/:id', protect, updateSubCategory);
router.delete('/:id', protect, deleteSubCategory);

module.exports = router;
