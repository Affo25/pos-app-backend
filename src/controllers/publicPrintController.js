const fs = require('fs');
const epsonPrinter = require('../services/epsonPrinterService');

function parsePrintOptions(body = {}) {
  const copies = body.copies != null ? Number(body.copies) : 1;
  const monochrome =
    body.monochrome === true ||
    body.monochrome === 'true' ||
    process.env.EPSON_PRINT_MONOCHROME === 'true';
  const scale = body.scale || 'fit';
  const printer = body.printer || body.printerName || null;

  return { copies, monochrome, scale, printer };
}

/**
 * GET /api/public/print/health — liveness
 */
exports.health = async (req, res) => {
  try {
    const status = await epsonPrinter.getPrinterStatus();
    return res.json({
      success: true,
      service: 'epson-l8050-print-api',
      ...status,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * GET /api/public/print/status — printer resolution
 */
exports.status = async (req, res) => {
  try {
    const status = await epsonPrinter.getPrinterStatus(req.query.printer);
    const ready = Boolean(status.configuredPrinter) && status.windowsPrintSupported;
    return res.json({
      success: true,
      ready,
      ...status,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/public/print/printers — list Windows printers
 */
exports.listPrinters = async (req, res) => {
  try {
    const printers = await epsonPrinter.listPrinters();
    return res.json({ success: true, printers });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Could not list printers',
      detail: err.message,
    });
  }
};

/**
 * Print a PDF on the Epson L8050 (Windows print spooler).
 *
 * Multipart (recommended): POST /api/public/print/pdf
 *   - form field `pdf` = PDF file
 *   - optional: copies, monochrome, scale, printer
 *
 * Also: POST /api/public/print  or  POST /api/public/print/upload
 * JSON: POST /api/public/print/pdf/json  { pdfBase64 }
 * Raw:  POST /api/public/print/pdf/raw   Content-Type: application/pdf
 */
exports.printPdf = async (req, res) => {
  let filepath = null;

  try {
    const options = parsePrintOptions(req.body || {});
    let buffer = null;

    if (req.file && req.file.path) {
      filepath = req.file.path;
    } else if (req.file && req.file.buffer) {
      filepath = epsonPrinter.savePdfToTemp(req.file.buffer, 'upload');
    } else if (req.body && req.body.pdfBase64) {
      const raw = String(req.body.pdfBase64).replace(/^data:application\/pdf;base64,/i, '');
      buffer = Buffer.from(raw, 'base64');
      if (!buffer.length) {
        return res.status(400).json({ success: false, error: 'pdfBase64 is empty or invalid' });
      }
      filepath = epsonPrinter.savePdfToTemp(buffer, 'b64');
    } else if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      filepath = epsonPrinter.savePdfToTemp(req.body, 'raw');
    } else {
      return res.status(400).json({
        success: false,
        error: 'PDF required. Send multipart field "pdf", raw application/pdf body, or JSON pdfBase64.',
      });
    }

    if (filepath && !fs.existsSync(filepath)) {
      return res.status(400).json({ success: false, error: 'Uploaded PDF file not found' });
    }

    const header = Buffer.alloc(4);
    const fd = fs.openSync(filepath, 'r');
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);
    if (header.toString() !== '%PDF') {
      try {
        fs.unlinkSync(filepath);
      } catch {
        /* ignore */
      }
      return res.status(400).json({ success: false, error: 'File is not a valid PDF' });
    }

    const result = await epsonPrinter.printPdfFile(filepath, options);
    epsonPrinter.scheduleCleanup(filepath);

    return res.json({
      success: true,
      message: `PDF sent to ${result.printer}`,
      ...result,
    });
  } catch (err) {
    if (filepath) epsonPrinter.scheduleCleanup(filepath, 2000);
    console.error('Public print PDF error:', err);

    const status =
      err.code === 'PRINTER_NOT_FOUND' || err.code === 'PLATFORM_UNSUPPORTED' ? 503 : 500;

    return res.status(status).json({
      success: false,
      error: err.message,
      code: err.code || 'PRINT_FAILED',
    });
  }
};
