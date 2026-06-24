/**
 * CORS for browser clients (local dev + deployed frontend).
 * Set FRONTEND_URL or CORS_ORIGINS (comma-separated) in backend env / Vercel variables.
 */
const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

const DEFAULT_FRONTEND_URL = 'https://pos-opal-ten.vercel.app';

function normalizeOrigin(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

function getAllowedOrigins() {
  const fromEnv = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    DEFAULT_FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || '').split(','),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set([...LOCAL_ORIGINS, ...fromEnv])];
}

const allowedOrigins = getAllowedOrigins();

module.exports = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};
