const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { TMP_DIR } = require('../paths');
const { money, drawLogoCircular } = require('../shared');

const PW = 595.28;
const PH = 841.89;
const M = 42;

const EMERALD = '#306844';
const FOREST = '#182c25';
const SOFT = '#e6efe9';
const DARK = '#1f2937';
const MUTED = '#64748b';
const LINE = '#dce5e0';
const WHITE = '#ffffff';
const BW = '#374151';
const BW_SOFT = '#f3f4f6';

function resolvePalette(B) {
  if (B && B.printGrayscale) {
    return { primary: BW, soft: BW_SOFT, ink: FOREST };
  }
  return {
    primary: B?.accent || EMERALD,
    soft: SOFT,
    ink: B?.forest || FOREST,
  };
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function blockLines(doc, lines, x, y, w) {
  let cy = y;
  (lines || []).filter((l) => l != null && String(l).trim()).forEach((line, i) => {
    doc
      .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(i === 0 ? 10 : 8.5)
      .fillColor(i === 0 ? DARK : MUTED)
      .text(String(line), x, cy, { width: w });
    cy += i === 0 ? 13 : 11;
  });
  return cy;
}

/**
 * Modern professional A4 purchase order — matches modern sale styling.
 */
function generate(inv, B) {
  return new Promise((resolve, reject) => {
    const ref = (inv.invoice_no || 'PO').toString().replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `purchase-order-${ref}.pdf`;
    const filepath = path.join(TMP_DIR, filename);
    const doc = new PDFDocument({ size: 'A4', margin: M });
    const ws = fs.createWriteStream(filepath);
    doc.pipe(ws);

    const { primary, soft, ink } = resolvePalette(B);
    const items = inv.items || [];
    const subtotal = Number(inv.total_amount || 0);
    const returned = Number(inv.returned_total || 0);
    const taxAmt = Number(inv.tax_amount || 0);
    const netAmt = Number(inv.net_amount != null ? inv.net_amount : subtotal - returned + taxAmt);
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
    const shipLines = [B.name || 'Company', B.address || '', B.phone ? `Phone: ${B.phone}` : '', B.email || ''].filter(
      Boolean,
    );

    const contentW = PW - M * 2;
    let y = M;

    doc.rect(0, 0, 8, PH).fill(primary);
    doc.rect(8, 0, PW - 8, 92).fill(ink);

    const logoSize = 46;
    if (B.logoPath) {
      drawLogoCircular(doc, B.logoPath, M + logoSize / 2 + 4, 23, logoSize);
    } else {
      doc.circle(M + logoSize / 2 + 4, 23 + logoSize / 2, logoSize / 2).fill(primary);
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(WHITE)
        .text((B.name || 'P').charAt(0).toUpperCase(), M + 4, 34, { width: logoSize, align: 'center' });
    }

    const headX = M + logoSize + 18;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE).text(B.name || 'Company', headX, 26, {
      width: 220,
    });
    doc.font('Helvetica').fontSize(8).fillColor('#c5d4ce');
    if (B.tagline) doc.text(B.tagline, headX, 46, { width: 220 });
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(WHITE)
      .text('PURCHASE ORDER', PW - M - 200, 28, { width: 200, align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#c5d4ce')
      .text(`# ${inv.invoice_no || '—'}`, PW - M - 200, 52, { width: 200, align: 'right' });

    y = 112;

    const chipW = contentW / 3;
    [
      { label: 'Order date', value: fmtDate(inv.sale_date || inv.order_date) },
      { label: 'Status', value: String(inv.status || 'Open').toUpperCase() },
      { label: 'Items', value: String(items.length) },
    ].forEach((chip, i) => {
      const x = M + i * chipW;
      doc.roundedRect(x + (i ? 4 : 0), y, chipW - 8, 42, 8).fill(soft);
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(chip.label, x + 12, y + 8);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(chip.value, x + 12, y + 22, {
        width: chipW - 28,
      });
    });
    y += 58;

    const colW = (contentW - 24) / 2;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('VENDOR', M, y);
    doc.text('SHIP TO', M + colW + 24, y);
    y += 12;
    const start = y;
    const afterV = blockLines(doc, vendorLines, M, start, colW);
    const afterS = blockLines(doc, shipLines, M + colW + 24, start, colW);
    y = Math.max(afterV, afterS) + 18;

    const colQty = 48;
    const colRate = 78;
    const colAmt = 82;
    const colDesc = contentW - colQty - colRate - colAmt;

    doc.roundedRect(M, y, contentW, 24, 6).fill(primary);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE);
    doc.text('Qty', M + 8, y + 8, { width: colQty - 8 });
    doc.text('Description', M + colQty + 6, y + 8, { width: colDesc - 10 });
    doc.text('Unit price', M + colQty + colDesc, y + 8, { width: colRate - 6, align: 'right' });
    doc.text('Amount', M + colQty + colDesc + colRate, y + 8, { width: colAmt - 8, align: 'right' });
    y += 28;

    items.forEach((it, idx) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.unit_price || 0);
      const amt = Number(it.line_total != null ? it.line_total : qty * price);
      const name = it.product_name || '—';
      const rowH = 26;
      if (idx % 2 === 1) doc.rect(M, y, contentW, rowH).fill('#f7faf8');
      doc.font('Helvetica').fontSize(9).fillColor(DARK);
      doc.text(String(qty), M + 8, y + 8, { width: colQty - 8 });
      doc.font('Helvetica-Bold').fontSize(9).text(name, M + colQty + 6, y + 8, {
        width: colDesc - 10,
        ellipsis: true,
      });
      doc.font('Helvetica').fontSize(9);
      doc.text(money(price), M + colQty + colDesc, y + 8, { width: colRate - 6, align: 'right' });
      doc.text(money(amt), M + colQty + colDesc + colRate, y + 8, {
        width: colAmt - 8,
        align: 'right',
      });
      y += rowH;
    });

    if (!items.length) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('No line items', M + 12, y + 8);
      y += 28;
    }

    y += 16;
    const totalsW = 230;
    const totalsX = PW - M - totalsW;
    const drawTotal = (label, value, strong = false) => {
      const h = strong ? 28 : 18;
      if (strong) doc.roundedRect(totalsX, y, totalsW, h, 8).fill(primary);
      doc
        .font(strong ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(strong ? 11 : 9)
        .fillColor(strong ? WHITE : DARK);
      doc.text(label, totalsX + 12, y + (strong ? 8 : 4), { width: 100 });
      doc.text(value, totalsX + 110, y + (strong ? 8 : 4), {
        width: totalsW - 122,
        align: 'right',
      });
      y += h + (strong ? 0 : 2);
    };

    drawTotal('Subtotal', money(subtotal));
    if (returned > 0) drawTotal('Returns', `-${money(returned)}`);
    if (taxAmt > 0) drawTotal('Tax', money(taxAmt));
    y += 4;
    drawTotal('Order total', money(netAmt), true);
    y += 8;
    if (paid > 0) drawTotal('Amount paid', money(paid));
    if (remaining > 0) drawTotal('Balance due', money(remaining));

    const footY = Math.max(y + 36, PH - M - 78);
    doc.moveTo(M, footY).lineTo(PW - M, footY).lineWidth(0.8).strokeColor(LINE).stroke();
    doc
      .font('Helvetica-Oblique')
      .fontSize(16)
      .fillColor(primary)
      .text('Thank you', M, footY + 14);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        B.footerText ||
          'Please reference this purchase order number on all invoices and shipping documents.',
        M + 110,
        footY + 16,
        { width: contentW - 110, lineGap: 2 },
      );

    doc.end();
    ws.on('finish', () => resolve(filepath));
    ws.on('error', reject);
  });
}

module.exports = { generate };
