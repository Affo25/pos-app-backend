const path = require('path');

function loadEnv() {
  const root = path.join(__dirname, '..');
  require('dotenv').config({ path: path.join(root, '.env') });
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    require('dotenv').config({ path: path.join(root, '.env.txt') });
  }
}

module.exports = { loadEnv };
