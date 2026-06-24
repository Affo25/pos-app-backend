const path = require('path');
const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const settingsController = require('../controllers/settingsController');
const { getInvoiceLogosDir } = require('../config/uploadsPath');

const router = express.Router();

const logoDir = getInvoiceLogosDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `logo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && /^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.get('/', protect, settingsController.getSettings);
router.put('/', protect, settingsController.updateSettings);
router.post(
  '/invoice-logo',
  protect,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Invalid upload' });
      next();
    });
  },
  settingsController.uploadInvoiceLogo,
);

module.exports = router;
