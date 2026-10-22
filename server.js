const path = require('path');
const { loadEnv } = require('./src/loadEnv');
const { createApp } = require('./src/createApp');

loadEnv();

try {
  const { getEmailStatus } = require('./src/services/emailService');
  const emailStatus = getEmailStatus();
  if (emailStatus.provider === 'resend' && emailStatus.resendConfigured) {
    console.log('✅ Email: Resend API');
  } else if (emailStatus.smtpConfigured) {
    console.log(`✅ Email: SMTP (${process.env.SMTP_HOST || 'configured'})`);
  } else if (emailStatus.resendConfigured) {
    console.log('✅ Email: Resend API (auto)');
  } else {
    console.warn(
      '⚠️ Email not configured — set RESEND_API_KEY (resend.com) or SMTP_USER/SMTP_PASS in backend/.env',
    );
  }
} catch (e) {
  console.warn('⚠️ Email status check skipped:', e.message);
}

try {
  const { isWhatsAppConfigured, getMessageMode } = require('./src/services/whatsappService');
  if (isWhatsAppConfigured()) {
    console.log(`✅ WhatsApp Cloud API (${getMessageMode()} mode)`);
  } else {
    console.warn(
      '⚠️ WhatsApp not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env',
    );
  }
} catch (e) {
  console.warn('⚠️ WhatsApp status check skipped:', e.message);
}

try {
  const epsonPrinter = require('./src/services/epsonPrinterService');
  if (epsonPrinter.isWindows()) {
    console.log('✅ Public Epson print API: /api/public/print (Windows, no API key)');
  } else {
    console.warn('⚠️ Public print API requires Windows — direct printing unavailable on this OS');
  }
} catch (e) {
  console.warn('⚠️ Print API status check skipped:', e.message);
}

const app = createApp();

const rawPort = process.env.PORT || '5000';
const PORT = Number.parseInt(rawPort, 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!Number.isFinite(PORT) || PORT < 1) {
  console.error('❌ Invalid PORT:', process.env.PORT);
  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Listening', server.address());
  console.log(`📡 Environment: ${NODE_ENV}`);
  console.log('✅ Health: GET/HEAD /health, GET /api/health');
});
