const { S3Client } = require('@aws-sdk/client-s3');

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY;
  const secretAccessKey = process.env.CLOUDFLARE_SECRET_KEY;
  const bucket = process.env.CLOUDFLARE_BUCKET_NAME;
  const endpoint =
    process.env.CLOUDFLARE_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const publicUrl = (process.env.PUBLIC_CLOUDFLARE_URL || '').replace(/\/$/, '');
  const region = process.env.CLOUDFLARE_REGION || 'auto';

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicUrl,
    region,
  };
}

function isR2Configured() {
  const cfg = getR2Config();
  return Boolean(
    cfg.accessKeyId &&
      cfg.secretAccessKey &&
      cfg.bucket &&
      cfg.endpoint &&
      cfg.publicUrl,
  );
}

let cachedClient = null;

function getR2Client() {
  if (cachedClient) return cachedClient;

  const cfg = getR2Config();
  if (!isR2Configured()) {
    const err = new Error(
      'Cloudflare R2 is not configured. Set CLOUDFLARE_ACCESS_KEY, CLOUDFLARE_SECRET_KEY, CLOUDFLARE_BUCKET_NAME, CLOUDFLARE_ACCOUNT_ID (or CLOUDFLARE_ENDPOINT), and PUBLIC_CLOUDFLARE_URL.',
    );
    err.code = 'R2_NOT_CONFIGURED';
    throw err;
  }

  cachedClient = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  return cachedClient;
}

module.exports = {
  getR2Config,
  getR2Client,
  isR2Configured,
};
