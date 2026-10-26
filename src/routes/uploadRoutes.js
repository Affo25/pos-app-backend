const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB (local/Railway); Vercel body limit is ~4.5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    const type = file.mimetype || '';
    if (/^image\//.test(type) || /^video\//.test(type)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image and video files are allowed'));
  },
});

function runUpload(req, res, next) {
  const handler = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 10 },
  ]);

  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Invalid upload' });
    }

    const single = req.files?.file?.[0];
    const many = req.files?.files || [];
    const all = [];
    if (single) all.push(single);
    if (many.length) all.push(...many);

    req.file = all[0] || null;
    req.files = all;
    next();
  });
}

// Public — no auth
router.post('/presign', uploadController.presignUpload);
router.post('/', runUpload, uploadController.uploadMedia);

module.exports = router;
