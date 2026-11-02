const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getUploadsRoot, ensureDir } = require('../config/uploadsPath');

const DEFAULT_FOLDER = 'products';

function sanitizeFilename(name) {
  const base = path.basename(name || 'file').replace(/[^\w.\-()+ ]+/g, '_');
  return base.slice(0, 180) || 'file';
}

function buildLocalKey(originalname, folder) {
  const safe = sanitizeFilename(originalname);
  const id = crypto.randomBytes(8).toString('hex');
  const stamp = Date.now();
  const prefix = (folder || DEFAULT_FOLDER).replace(/^\/+|\/+$/g, '');
  return `${prefix}/${stamp}-${id}-${safe}`;
}

async function uploadBufferLocal(file, { publicBaseUrl } = {}) {
  const { buffer, originalname, mimetype, folder } = file;
  if (!buffer?.length) {
    const err = new Error('Empty file');
    err.code = 'EMPTY_FILE';
    throw err;
  }

  const key = buildLocalKey(originalname, folder || DEFAULT_FOLDER);
  const absPath = path.join(getUploadsRoot(), key);
  ensureDir(path.dirname(absPath));
  await fs.promises.writeFile(absPath, buffer);

  const url = publicBaseUrl
    ? `${publicBaseUrl}/uploads/${key.split(path.sep).join('/')}`
    : `/uploads/${key.split(path.sep).join('/')}`;

  return {
    key,
    url,
    bucket: 'local',
    contentType: mimetype || 'application/octet-stream',
    size: buffer.length,
    originalname: originalname || null,
    storage: 'local',
  };
}

module.exports = {
  uploadBufferLocal,
  DEFAULT_FOLDER,
};
