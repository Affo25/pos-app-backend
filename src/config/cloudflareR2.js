const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');

function clean(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function getR2Config() {
  const accountId = clean(process.env.CLOUDFLARE_ACCOUNT_ID);
  const accessKeyId = clean(
    process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY,
  );
  const secretAccessKey = clean(
    process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_KEY,
  );
  const bucket = clean(
    process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_BUCKET_NAME,
  );
  const endpoint = clean(
    process.env.CLOUDFLARE_ENDPOINT ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ''),
  );
  const publicUrl = clean(
    process.env.PUBLIC_CLOUDFLARE_URL || process.env.PUBLIC_R2_URL || '',
  ).replace(/\/$/, '');
  const region = clean(process.env.CLOUDFLARE_REGION) || 'auto';

  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint, publicUrl, region };
}

/** Clear cached client after .env credential changes (dev restarts). */
function resetR2Client() {
  cachedClient = null;
}

function isR2Configured() {
  const cfg = getR2Config();
  return Boolean(cfg.accessKeyId && cfg.secretAccessKey && cfg.bucket && cfg.endpoint);
}

let cachedClient = null;

function getR2Client() {
  if (cachedClient) return cachedClient;
  const cfg = getR2Config();
  if (!isR2Configured()) {
    const err = new Error('Cloudflare R2 is not configured');
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
    // R2 is S3-compatible and expects path-style bucket addressing.
    forcePathStyle: true,
  });
  return cachedClient;
}

/**
 * Verifies credentials can reach the configured R2 bucket.
 * Resolves with { bucket, endpoint, publicUrl } or rejects with Error.
 */
async function verifyR2Connection() {
  if (!isR2Configured()) {
    const err = new Error('R2 is not configured');
    err.code = 'R2_NOT_CONFIGURED';
    throw err;
  }
  const cfg = getR2Config();
  const client = getR2Client();
  await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
  return {
    bucket: cfg.bucket,
    endpoint: cfg.endpoint,
    publicUrl: cfg.publicUrl || null,
  };
}

module.exports = {
  getR2Config,
  getR2Client,
  isR2Configured,
  resetR2Client,
  verifyR2Connection,
};
