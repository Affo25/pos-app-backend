require('../src/loadEnv').loadEnv();
const { uploadBufferToR2 } = require('../src/services/r2UploadService');

(async () => {
  try {
    const result = await uploadBufferToR2({
      buffer: Buffer.from('r2-connectivity-check'),
      originalname: 'r2-check.txt',
      mimetype: 'text/plain',
      folder: 'products',
    });
    console.log('R2_OK', JSON.stringify({ key: result.key, url: result.url }));
    process.exit(0);
  } catch (err) {
    console.error('R2_FAIL', err.Code || err.name || '', err.message);
    process.exit(1);
  }
})();
