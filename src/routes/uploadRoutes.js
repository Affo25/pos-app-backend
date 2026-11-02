const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && /^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

function runUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Invalid upload' });
    next();
  });
}

// Public read for product images in table
router.get('/object', uploadController.getObject);
// Auth required for product form uploads
router.post('/', protect, runUpload, uploadController.uploadMedia);

module.exports = router;
