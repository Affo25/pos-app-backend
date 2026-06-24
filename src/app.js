/**
 * Full Express app (scripts/tests). Production: server.js (Railway/local) or api/index.js (Vercel).
 */
const { createApp } = require('./createApp');

module.exports = createApp();
