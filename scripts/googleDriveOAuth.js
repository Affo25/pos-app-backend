/**
 * One-time helper: get a Google OAuth refresh token for personal Drive uploads.
 *
 * Uses Desktop OAuth client JSON from src/config/client_secret_*.json
 * or GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET from .env
 *
 * Run: npm run drive:oauth
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { google } = require('googleapis');
const { loadEnv } = require('../src/loadEnv');
const {
  SCOPES,
  getOAuthClientCredentials,
} = require('../src/config/googleDrive');

loadEnv();

function upsertEnvValue(key, value) {
  const envPath = path.join(__dirname, '..', '.env');
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) {
    text = text.replace(re, line);
  } else {
    text = `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, text, 'utf8');
}

async function main() {
  const creds = getOAuthClientCredentials();
  if (!creds) {
    console.error(
      'Missing OAuth client. Place client_secret_*.json in src/config/ or set GOOGLE_OAUTH_CLIENT_ID/SECRET in .env',
    );
    process.exit(1);
  }

  const { clientId, clientSecret, source } = creds;
  console.log(`Using OAuth client from: ${source}`);

  // Desktop clients allow loopback; use localhost to match downloaded JSON redirect_uris
  const redirectUri = 'http://localhost:53682/oauth2callback';
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n1) Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2) Sign in with the Google account that owns the videoRecorder folder.');
  console.log('3) Waiting for redirect on', redirectUri, '...\n');

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://localhost:53682');
        if (u.pathname !== '/oauth2callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const authCode = u.searchParams.get('code');
        const err = u.searchParams.get('error');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        if (err) {
          res.end(`<h2>Auth failed: ${err}</h2>`);
          server.close();
          reject(new Error(err));
          return;
        }
        res.end(
          '<h2>Google Drive connected.</h2><p>You can close this tab and return to the terminal.</p>',
        );
        server.close();
        if (!authCode) reject(new Error('No code in callback'));
        else resolve(authCode);
      } catch (e) {
        reject(e);
      }
    });
    server.on('error', reject);
    server.listen(53682, '127.0.0.1');
  });

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      'No refresh_token returned. Revoke app access at https://myaccount.google.com/permissions then rerun npm run drive:oauth',
    );
    process.exit(1);
  }

  upsertEnvValue('GOOGLE_OAUTH_CLIENT_ID', clientId);
  upsertEnvValue('GOOGLE_OAUTH_CLIENT_SECRET', clientSecret);
  upsertEnvValue('GOOGLE_OAUTH_REFRESH_TOKEN', tokens.refresh_token);

  console.log('\n✅ Success. Saved refresh token to .env');
  console.log('\nAdd these on Vercel and redeploy:');
  console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
  console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`);
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('GOOGLE_DRIVE_FOLDER_NAME=videoRecorder');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
