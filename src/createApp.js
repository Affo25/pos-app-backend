const express = require('express');
const connectDB = require('./config/db');
const setupRoutes = require('./routesSetup');

let dbInitStarted = false;

function ensureDb() {
  if (dbInitStarted) return;
  dbInitStarted = true;
  connectDB().catch((err) => {
    console.error('MongoDB connection failed:', err.message);
  });
}

/**
 * Builds the Express app used by server.js (Railway/local) and api/index.js (Vercel).
 */
function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  const sendHealth = (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  };

  app.get('/health', sendHealth);
  app.head('/health', (req, res) => res.status(200).end());
  app.get('/api/health', sendHealth);
  app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).type('text/plain').send('ok');
  });

  setupRoutes(app);
  ensureDb();

  return app;
}

module.exports = { createApp };
