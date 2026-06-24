const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { TMP_DIR } = require('../paths');
const { money } = require('../shared');

const PW = 595.28;
const PH = 841.89;
const M = 48;

const NAVY = '#1e3a5f';
const NAVY_DARK = '#152a45';
const GREY_HEADER = '#e8ecf1';
const DARK = '#1f2937';
const MUTED = '#64748b';
const LINE = '#d1d5db';
const WHITE = '#ffffff';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function blockLines(doc, lines, x, y, w, opts = {}) {
  const size = opts.size || 9;
  const color = opts.color || DARK;
  const bold = opts.bold || false;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);
  let cy = y;
  (lines || []).filter(Boolean).forEach((line) => {
    doc.text(String(line), x, cy, { width: w });
    cy += size + 5;
  });
  return cy;
}

/**
 * Professional purchase order (Invoice Home–style layout).
 */
function generate(inv, B) {
  return new Promise((resolve, reject) => {
    const ref = (inv.invoice_no || 'PO').toString().replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `purchase-order-${ref}.pdf`;
    const filepath = path.join(TMP_DIR, filename);

    const doc = new PDFDocument({ size: 'A4', margin: M });
    const ws = fs.createWriteStream(filepath);
    doc.pipe(ws);

    const items = inv.items || [];
    const subtotal = Number(inv.total_amount || 0);
    const returned = Number(inv.returned_total || 0);
    const netAmt = Number(inv.net_amount != null ? inv.net_amount : subtotal - returned);
    const taxAmt = Number(inv.tax_amount || 0);
    const paid = Number(inv.amount_paid || 0);
    const remaining = Number(
      inv.amount_remaining != null ? inv.amount_remaining : Math.max(0, netAmt - paid),
    );

    const vendorName =
      inv.vendor_name ||
      String(inv.customer_name || 'Vendor').replace(/\s*\(Purchase order\)\s*/i, '').trim() ||
      'Vendor';
    const vendorLines = [
      vendorName,
      inv.vendor_address || '',
      inv.vendor_phone ? `Phone: ${inv.vendor_phone}` : '',
      inv.vendor_email || '',
    ].filter(Boolean);

    const shipLines = [
      B.name || 'Company',
      B.address || '',
      B.phone ? `Phone: ${B.phone}` : '',
      B.email || '',
    ].filter(Boolean);

    const accent = B.forest || B.accent || NAVY;
    const footerBar = NAVY_DARK;

    let y = M;

    // —— Title row ——
    doc.font('Helvetica-Bold').fontSize(28).fillColor(DARK).text('PURCHASE ORDER', M, y, {
      width: 360,
    });

    const logoX = PW - M - 72;
    if (B.logoPath) {
      try {
        doc.save();
        doc.circle(logoX + 36, y + 28, 32).clip();
        doc.image(B.logoPath, logoX, y, { width: 72, height: 56, fit: [72, 56] });
        doc.restore();
        doc.circle(logoX + 36, y + 28, 32).lineWidth(0.5).strokeColor(LINE).stroke();
      } catch (e) {
        doc.roundedRect(logoX, y + 4, 72, 48, 4).strokeColor(LINE).stroke();
        doc.fontSize(8).fillColor(MUTED).text('LOGO', logoX, y + 22, { width: 72, align: 'center' });
      }
    } else {
      doc.roundedRect(logoX, y + 4, 72, 48, 4).strokeColor(LINE).stroke();
      doc.fontSize(8).fillColor(MUTED).text('LOGO', logoX, y + 22, { width: 72, align: 'center' });
    }

    y += 58;

    // —— Vendor / Ship to ——
    const colW = (PW - M * 2 - 24) / 2;
    const rightMetaX = PW - M - 160;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('VENDOR', M, y);
    doc.text('SHIP TO', M + colW + 24, y);
    y += 12;

    const blockStart = y;
    const afterVendor = blockLines(doc, vendorLines, M, blockStart, colW, { size: 9 });
    const afterShip = blockLines(doc, shipLines, M + colW + 24, blockStart, colW, { size: 9 });
    y = Math.max(afterVendor, afterShip) + 8;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK);
    doc.text('ORDER #', rightMetaX, blockStart);
    doc.text('DATE', rightMetaX, blockStart + 36);
    doc.font('Helvetica').fontSize(10).fillColor(DARK);
    doc.text(String(inv.invoice_no || '—'), rightMetaX + 52, blockStart, { width: 100 });
    doc.text(fmtDate(inv.sale_date), rightMetaX + 52, blockStart + 36, { width: 100 });

    if (inv.status) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('STATUS', rightMetaX, blockStart + 72);
      doc.font('Helvetica').fontSize(9).fillColor(DARK).text(String(inv.status).toUpperCase(), rightMetaX + 52, blockStart + 72);
    }

    y += 14;
    doc.moveTo(M, y).lineTo(PW - M, y).lineWidth(0.75).strokeColor(LINE).stroke();
    y += 16;

    // —— Line items table ——
    const tableX = M;
    const tableW = PW - M * 2;
    const colQty = 42;
    const colPrice = 78;
    const colAmt = 78;
    const colDesc = tableW - colQty - colPrice - colAmt;

    doc.rect(tableX, y, tableW, 22).fill(GREY_HEADER);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK);
    doc.text('QTY', tableX + 6, y + 7, { width: colQty - 8 });
    doc.text('DESCRIPTION', tableX + colQty + 4, y + 7, { width: colDesc - 8 });
    doc.text('UNIT PRICE', tableX + colQty + colDesc, y + 7, { width: colPrice - 4, align: 'right' });
    doc.text('AMOUNT', tableX + colQty + colDesc + colPrice, y + 7, { width: colAmt - 6, align: 'right' });
    y += 22;

    doc.font('Helvetica').fontSize(9).fillColor(DARK);
    items.forEach((it, idx) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.unit_price || 0);
      const amt = Number(it.line_total != null ? it.line_total : qty * price);
      const name = it.product_name || '—';

      if (idx > 0) {
        doc.moveTo(tableX, y).lineTo(tableX + tableW, y).lineWidth(0.5).strokeColor('#eef2f7').stroke();
      }

      const rowH = 20;
      doc.text(String(qty), tableX + 6, y + 5, { width: colQty - 8 });
      doc.text(name, tableX + colQty + 4, y + 5, { width: colDesc - 8, ellipsis: true });
      doc.text(money(price), tableX + colQty + colDesc, y + 5, { width: colPrice - 4, align: 'right' });
      doc.text(money(amt), tableX + colQty + colDesc + colPrice, y + 5, { width: colAmt - 6, align: 'right' });
      y += rowH;
    });

    if (!items.length) {
      doc.text('No line items', tableX + colQty + 4, y + 5);
      y += 20;
    }

    y += 12;
    doc.moveTo(tableX, y).lineTo(tableX + tableW, y).lineWidth(0.75).strokeColor(LINE).stroke();
    y += 14;

    // —— Totals (right) ——
    const totalsX = PW - M - 200;
    const totalsW = 200;
    const labelX = totalsX;
    const valX = totalsX + 95;

    const drawTotalRow = (label, value, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9).fillColor(DARK);
      doc.text(label, labelX, y, { width: 90 });
      doc.text(value, valX, y, { width: totalsW - 95, align: 'right' });
      y += bold ? 20 : 16;
    };

    drawTotalRow('Subtotal', money(subtotal));
    if (returned > 0) {
      drawTotalRow('Returns', `-${money(returned)}`);
    }
    if (taxAmt > 0) {
      drawTotalRow('Sales Tax', money(taxAmt));
    }
    drawTotalRow('TOTAL', money(netAmt), true);

    if (paid > 0 || remaining > 0) {
      y += 4;
      doc.font('Helvetica').fontSize(8).fillColor(MUTED);
      doc.text('Payment', labelX, y);
      y += 12;
      if (paid > 0) drawTotalRow('Amount paid', money(paid));
      if (remaining > 0) drawTotalRow('Balance due', money(remaining), true);
    }

    // —— Thank you + terms ——
    const footerContentY = PH - M - 120;
    if (y < footerContentY - 40) {
      y = footerContentY - 40;
    }

    doc.font('Helvetica-Oblique').fontSize(22).fillColor(accent).text('Thank you', M, y);

    const termsX = PW - M - 240;
    const termsW = 240;
    let ty = y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK).text('TERMS & CONDITIONS', termsX, ty, {
      width: termsW,
    });
    ty += 12;
    const termsText =
      B.footerText ||
      'Payment is due within 30 days. Please reference the order number on all correspondence.';
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(termsText, termsX, ty, { width: termsW, lineGap: 2 });
    ty += 28;

    if (B.regNumber || B.gstin) {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text('Company details', termsX, ty);
      ty += 10;
      const co = [B.regNumber && `Reg: ${B.regNumber}`, B.gstin && `GSTIN: ${B.gstin}`].filter(Boolean);
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(co.join('  ·  '), termsX, ty, { width: termsW });
    }

    // —— Bottom navy bar ——
    const barH = 52;
    const barY = PH - barH;
    doc.rect(0, barY, PW, barH).fill(footerBar);
    doc.font('Helvetica').fontSize(8).fillColor(WHITE);
    const barText = [B.name, B.phone, B.email].filter(Boolean).join('   ·   ');
    doc.text(barText, M, barY + 18, { width: PW - M * 2, align: 'center' });
    if (B.address) {
      doc.fontSize(7).text(B.address, M, barY + 32, { width: PW - M * 2, align: 'center' });
    }

    doc.end();
    ws.on('finish', () => resolve(filepath));
    ws.on('error', reject);
  });
}

module.exports = { generate };
