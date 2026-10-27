const express = require('express');
const multer = require('multer');
const driveController = require('../controllers/driveController');

const router = express.Router();

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (Vercel still caps ~4.5MB)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
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
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Invalid upload' });
    }
    next();
  });
}

// Public — no auth
router.post('/upload', runUpload, driveController.uploadFile);
router.get('/files', driveController.listFiles);

module.exports = router;
