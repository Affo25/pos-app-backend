const path = require('path');
const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const settingsController = require('../controllers/settingsController');
const { getInvoiceLogosDir, getSidebarLogosDir } = require('../config/uploadsPath');

const router = express.Router();

const invoiceLogoDir = getInvoiceLogosDir();
const sidebarLogoDir = getSidebarLogosDir();

const invoiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, invoiceLogoDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `logo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});

const sidebarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, sidebarLogoDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `sidebar-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});

const imageFilter = (_req, file, cb) => {
  if (file.mimetype && /^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const uploadInvoice = multer({
  storage: invoiceStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadSidebar = multer({
  storage: sidebarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

router.get('/', protect, settingsController.getSettings);
router.put('/', protect, settingsController.updateSettings);
router.post(
  '/invoice-logo',
  protect,
  (req, res, next) => {
    uploadInvoice.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Invalid upload' });
      next();
    });
  },
  settingsController.uploadInvoiceLogo,
);
router.post(
  '/sidebar-logo',
  protect,
  (req, res, next) => {
    uploadSidebar.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Invalid upload' });
      next();
    });
  },
  settingsController.uploadSidebarLogo,
);

module.exports = router;
