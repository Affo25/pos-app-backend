const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TMP_PRINT_DIR = path.join(__dirname, '..', '..', 'tmp', 'print');
const DEFAULT_PRINTER_MATCH = /l8050|l805|eco\s*tank.*805/i;

function ensureTmpDir() {
  if (!fs.existsSync(TMP_PRINT_DIR)) {
    fs.mkdirSync(TMP_PRINT_DIR, { recursive: true });
  }
}

function isWindows() {
  return process.platform === 'win32';
}

/**
 * List installed printers (Windows PowerShell). Empty array on other OS.
 */
async function listPrinters() {
  if (!isWindows()) {
    return [];
  }

  const ps =
    'Get-Printer | Select-Object Name, DriverName, PrinterStatus, PortName | ConvertTo-Json -Compress';
  const { stdout } = await execAsync(`powershell -NoProfile -Command "${ps}"`, {
    timeout: 15000,
  });

  let printers = JSON.parse(stdout.trim());
  if (!Array.isArray(printers)) printers = [printers];

  return printers.map((p) => ({
    name: p.Name,
    driver: p.DriverName,
    status: p.PrinterStatus === 0 ? 'ready' : `status-${p.PrinterStatus}`,
    port: p.PortName,
  }));
}

function matchesEpsonL8050(name) {
  return DEFAULT_PRINTER_MATCH.test(String(name || ''));
}

/**
 * Resolve Epson L8050 printer name: env override, then first matching installed printer.
 */
async function resolveEpsonL8050Printer(explicitName) {
  const fromEnv = (process.env.EPSON_L8050_PRINTER_NAME || '').trim();
  const preferred = (explicitName || fromEnv || '').trim();

  if (preferred) {
    return preferred;
  }

  const printers = await listPrinters();
  const match = printers.find((p) => matchesEpsonL8050(p.name));
  return match ? match.name : null;
}

async function assertPrinterAvailable(printerName) {
  if (!isWindows()) {
    const err = new Error('Direct PDF printing is only supported on Windows with an installed printer driver.');
    err.code = 'PLATFORM_UNSUPPORTED';
    throw err;
  }

  if (!printerName) {
    const err = new Error(
      'Epson L8050 printer not found. Install the driver or set EPSON_L8050_PRINTER_NAME in backend/.env.',
    );
    err.code = 'PRINTER_NOT_FOUND';
    throw err;
  }

  const printers = await listPrinters();
  const exists = printers.some((p) => p.name === printerName);
  if (!exists) {
    const err = new Error(`Printer not found: ${printerName}`);
    err.code = 'PRINTER_NOT_FOUND';
    throw err;
  }

  return printerName;
}

/**
 * Write PDF buffer to a temp file and return its path.
 */
function savePdfToTemp(buffer, prefix = 'job') {
  ensureTmpDir();
  const filepath = path.join(TMP_PRINT_DIR, `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

function scheduleCleanup(filepath, delayMs = 15000) {
  setTimeout(() => {
    try {
      if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch {
      /* ignore */
    }
  }, delayMs);
}

/**
 * Send a PDF file to the printer using pdf-to-printer (Windows print spooler).
 */
async function printPdfFile(filepath, options = {}) {
  const {
    printer: explicitPrinter,
    copies = 1,
    monochrome = false,
    scale = 'fit',
  } = options;

  const printerName = await assertPrinterAvailable(await resolveEpsonL8050Printer(explicitPrinter));
  const pdfToPrinter = require('pdf-to-printer');

  const printOptions = {
    printer: printerName,
    copies: Math.min(Math.max(Number(copies) || 1, 1), 99),
    monochrome: Boolean(monochrome),
  };

  if (scale && ['fit', 'noscale', 'shrink'].includes(scale)) {
    printOptions.scale = scale;
  }

  await pdfToPrinter.print(filepath, printOptions);

  return {
    printer: printerName,
    copies: printOptions.copies,
    monochrome: printOptions.monochrome,
    scale: printOptions.scale || 'fit',
    host: os.hostname(),
  };
}

async function getPrinterStatus(explicitName) {
  const configuredName = await resolveEpsonL8050Printer(explicitName);
  const printers = await listPrinters();
  const epsonCandidates = printers.filter((p) => matchesEpsonL8050(p.name));

  return {
    platform: process.platform,
    windowsPrintSupported: isWindows(),
    configuredPrinter: configuredName,
    envPrinterName: (process.env.EPSON_L8050_PRINTER_NAME || '').trim() || null,
    epsonCandidates,
    allPrinters: printers,
  };
}

module.exports = {
  isWindows,
  listPrinters,
  matchesEpsonL8050,
  resolveEpsonL8050Printer,
  savePdfToTemp,
  printPdfFile,
  scheduleCleanup,
  getPrinterStatus,
  TMP_PRINT_DIR,
};
