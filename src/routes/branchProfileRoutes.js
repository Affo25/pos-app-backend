const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  createBranchProfile,
  getBranchProfiles,
  updateBranchProfile,
  deleteBranchProfile
} = require('../controllers/branchProfileController');

const router = express.Router();

router.post('/', protect, createBranchProfile);
router.get('/', protect, getBranchProfiles);
router.put('/:id', protect, updateBranchProfile);
router.delete('/:id', protect, deleteBranchProfile);

module.exports = router;
