const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  createSubCategory,
  getSubCategorys,
  updateSubCategory,
  deleteSubCategory
} = require('../controllers/subCategoryController');

const router = express.Router();

router.post('/', protect, createSubCategory);
router.get('/', protect, getSubCategorys);
router.put('/:id', protect, updateSubCategory);
router.delete('/:id', protect, deleteSubCategory);

module.exports = router;
