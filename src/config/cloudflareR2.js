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

function getMissingR2EnvKeys() {
  const cfg = getR2Config();
  const missing = [];
  if (!cfg.accessKeyId) missing.push('CLOUDFLARE_ACCESS_KEY');
  if (!cfg.secretAccessKey) missing.push('CLOUDFLARE_SECRET_KEY');
  if (!cfg.bucket) missing.push('CLOUDFLARE_BUCKET_NAME');
  if (!cfg.endpoint) missing.push('CLOUDFLARE_ENDPOINT or CLOUDFLARE_ACCOUNT_ID');
  if (!cfg.publicUrl) missing.push('PUBLIC_CLOUDFLARE_URL');
  return missing;
}

function isR2Configured() {
  return getMissingR2EnvKeys().length === 0;
}

let cachedClient = null;

function getR2Client() {
  if (cachedClient) return cachedClient;

  const cfg = getR2Config();
  if (!isR2Configured()) {
    const err = new Error(
      'Cloudflare R2 is not configured. Set CLOUDFLARE_* and PUBLIC_CLOUDFLARE_URL in env.',
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
  getMissingR2EnvKeys,
};
