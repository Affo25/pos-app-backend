/**
 * CORS for browser clients (localhost + any deployed frontend).
 * `origin: true` reflects the request Origin (required when credentials: true).
 *
 * Optional: set CORS_ORIGINS=comma,separated,exact,urls to log intent (not used for blocking).
 */
module.exports = {
  origin: true,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};
