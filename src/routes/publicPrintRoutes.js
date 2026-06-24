const express = require('express');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const publicPrintController = require('../controllers/publicPrintController');
const { TMP_PRINT_DIR } = require('../services/epsonPrinterService');

const router = express.Router();

const maxPrintMb = Math.min(Math.max(Number(process.env.PUBLIC_PRINT_MAX_MB) || 25, 1), 100);
const printLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.min(Math.max(Number(process.env.PUBLIC_PRINT_RATE_LIMIT) || 30, 5), 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many print requests. Try again later.' },
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const fs = require('fs');
    if (!fs.existsSync(TMP_PRINT_DIR)) {
      fs.mkdirSync(TMP_PRINT_DIR, { recursive: true });
    }
    cb(null, TMP_PRINT_DIR);
  },
  filename: (_req, file, cb) => {
    const safe = (file.originalname || 'document.pdf').replace(/[^\w.\-]+/g, '_');
    cb(null, `upload-${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxPrintMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/octet-stream' ||
      /\.pdf$/i.test(file.originalname || '');
    if (ok) return cb(null, true);
    return cb(new Error('Only PDF files are allowed'));
  },
});

router.use(printLimiter);

router.get('/health', publicPrintController.health);
router.get('/status', publicPrintController.status);
router.get('/printers', publicPrintController.listPrinters);

/** JSON body: { pdfBase64, copies?, monochrome?, scale?, printer? } */
router.post('/pdf/json', publicPrintController.printPdf);

const multipartPdfPrint = [
  upload.single('pdf'),
  (err, req, res, next) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return next();
  },
  publicPrintController.printPdf,
];

/** Multipart form-data: field `pdf` (file) + optional copies, monochrome, scale, printer */
router.post('/pdf', multipartPdfPrint);
router.post('/upload', multipartPdfPrint);
router.post('/', multipartPdfPrint);

/** Raw PDF body: Content-Type application/pdf */
router.post(
  '/pdf/raw',
  express.raw({
    type: ['application/pdf', 'application/octet-stream'],
    limit: `${maxPrintMb}mb`,
  }),
  publicPrintController.printPdf,
);

module.exports = router;
