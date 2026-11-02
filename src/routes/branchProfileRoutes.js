const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const {
  createBranchProfile,
  getBranchProfiles,
  updateBranchProfile,
  deleteBranchProfile,
  exportBranchProfilesToExcel,
  importBranchProfilesFromExcel,
} = require('../controllers/branchProfileController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, createBranchProfile);
router.post('/import-excel', protect, upload.single('file'), importBranchProfilesFromExcel);
router.get('/export-excel', protect, exportBranchProfilesToExcel);
router.get('/', protect, getBranchProfiles);
router.put('/:id', protect, updateBranchProfile);
router.delete('/:id', protect, deleteBranchProfile);

module.exports = router;
