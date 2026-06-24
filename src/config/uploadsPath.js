const fs = require('fs');
const os = require('os');
const path = require('path');

function getUploadsRoot() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'inventory-uploads');
  }
  return path.join(__dirname, '..', '..', 'uploads');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function getInvoiceLogosDir() {
  return ensureDir(path.join(getUploadsRoot(), 'invoice-logos'));
}

module.exports = {
  getUploadsRoot,
  getInvoiceLogosDir,
  ensureDir,
};
