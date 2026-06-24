const { exec } = require('child_process');
const fs = require('fs');
const { loadBrandingForRequest } = require('../pdf/branding');
const { generateInvoicePDF } = require('../pdf/generateInvoicePdf');
const { generateSalesRegisterPDF } = require('../pdf/generateSalesRegisterPdf');

const VALID_PDF_TEMPLATES = ['report_a4', 'purchase_order_a4', 'restaurant_80mm', 'a4_80mm_strip', 'pos_receipt'];

function applyTemplateOverride(branding, template) {
  if (template && VALID_PDF_TEMPLATES.includes(template)) {
    return { ...branding, template };
  }
  return branding;
}

/**
 * GET /api/print/printers — list Windows printers via PowerShell
 */
exports.getPrinters = (req, res) => {
  const ps = `Get-Printer | Select-Object Name, DriverName, PrinterStatus, PortName | ConvertTo-Json -Compress`;
  exec(`powershell -NoProfile -Command "${ps}"`, { timeout: 10000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: 'Could not list printers', detail: stderr || err.message });
    try {
      let printers = JSON.parse(stdout.trim());
      if (!Array.isArray(printers)) printers = [printers];
      return res.json({
        printers: printers.map((p) => ({
          name: p.Name,
          driver: p.DriverName,
          status: p.PrinterStatus === 0 ? 'ready' : `status-${p.PrinterStatus}`,
          port: p.PortName,
        })),
      });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse printer list', raw: stdout });
    }
  });
};

/**
 * POST /api/print/invoice — generate PDF and send to Windows printer
 */
exports.printInvoice = async (req, res) => {
  try {
    const { invoice, printer, template } = req.body;
    if (!invoice) return res.status(400).json({ error: 'Invoice data is required' });

    let branding = await loadBrandingForRequest(req);
    branding = applyTemplateOverride(branding, template);
    const filepath = await generateInvoicePDF(invoice, { ...branding, printGrayscale: true });

    if (!printer) {
      return res.json({ success: true, message: 'PDF generated (no printer specified)', filepath });
    }

    const pdfToPrinter = require('pdf-to-printer');
    await pdfToPrinter.print(filepath, { printer, monochrome: true });

    setTimeout(() => { try { fs.unlinkSync(filepath); } catch { /* ok */ } }, 10000);

    return res.json({ success: true, message: `Sent to printer: ${printer}` });
  } catch (err) {
    console.error('Print error:', err);
    return res.status(500).json({ error: 'Print failed', detail: err.message });
  }
};

/**
 * POST /api/print/preview — return the PDF as a downloadable file
 */
exports.previewInvoice = async (req, res) => {
  try {
    const { invoice, template } = req.body;
    if (!invoice) return res.status(400).json({ error: 'Invoice data is required' });

    let branding = await loadBrandingForRequest(req);
    branding = applyTemplateOverride(branding, template);
    const filepath = await generateInvoicePDF(invoice, branding);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoice_no || 'preview'}.pdf"`);

    const rs = fs.createReadStream(filepath);
    rs.pipe(res);
    rs.on('end', () => {
      setTimeout(() => { try { fs.unlinkSync(filepath); } catch { /* ok */ } }, 5000);
    });
  } catch (err) {
    console.error('Preview error:', err);
    return res.status(500).json({ error: 'Preview failed', detail: err.message });
  }
};

/**
 * POST /api/print/sales-register/preview — PDF of all rows in payload (current filtered list)
 */
exports.previewSalesRegister = async (req, res) => {
  try {
    const { records, subtitle, generated_at } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }

    const branding = await loadBrandingForRequest(req);
    const filepath = await generateSalesRegisterPDF(
      { records, subtitle, generated_at },
      branding
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="sales-register.pdf"');

    const rs = fs.createReadStream(filepath);
    rs.pipe(res);
    rs.on('end', () => {
      setTimeout(() => { try { fs.unlinkSync(filepath); } catch { /* ok */ } }, 5000);
    });
  } catch (err) {
    console.error('Sales register preview error:', err);
    return res.status(500).json({ error: 'Preview failed', detail: err.message });
  }
};

/**
 * POST /api/print/sales-register/print — generate register PDF and send to Windows printer
 */
exports.printSalesRegister = async (req, res) => {
  try {
    const { records, subtitle, generated_at, printer } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }
    if (!printer) {
      return res.status(400).json({ error: 'printer name is required' });
    }

    const branding = await loadBrandingForRequest(req);
    const filepath = await generateSalesRegisterPDF(
      { records, subtitle, generated_at },
      { ...branding, printGrayscale: true },
    );

    const pdfToPrinter = require('pdf-to-printer');
    await pdfToPrinter.print(filepath, { printer, monochrome: true });

    setTimeout(() => { try { fs.unlinkSync(filepath); } catch { /* ok */ } }, 10000);

    return res.json({ success: true, message: `Sales register sent to printer: ${printer}` });
  } catch (err) {
    console.error('Sales register print error:', err);
    return res.status(500).json({ error: 'Print failed', detail: err.message });
  }
};
