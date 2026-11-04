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
 * Modern professional A4 sale invoice — emerald accent, clean grid.
 */
function generate(inv, B) {
  return new Promise((resolve, reject) => {
    const filename = `invoice-${(inv.invoice_no || Date.now()).toString().replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const filepath = path.join(TMP_DIR, filename);
    const doc = new PDFDocument({ size: 'A4', margin: M });
    const ws = fs.createWriteStream(filepath);
    doc.pipe(ws);

    const { primary, soft, ink } = resolvePalette(B);
    const items = inv.items || [];
    const subtotal = Number(inv.total_amount || 0);
    const discAmt = Number(inv.discount_amount || 0);
    const taxAmt = Number(inv.tax_amount || 0);
    const returned = Number(inv.returned_total || 0);
    const netAmt = Number(
      inv.net_amount != null ? inv.net_amount : Math.max(0, subtotal - discAmt + taxAmt - returned),
    );
    const paid = Number(inv.amount_paid || inv.amount_tendered || inv.amount_received || 0);
    const remaining = Number(
      inv.amount_remaining != null ? inv.amount_remaining : Math.max(0, netAmt - paid),
    );

    const docTitle = String(inv.document_title || 'TAX INVOICE').trim().toUpperCase() || 'TAX INVOICE';
    const billLines =
      inv.bill_to_lines ||
      [inv.customer_name || 'Walk-in Customer', inv.customer_address, inv.customer_phone].filter(Boolean);

    const contentW = PW - M * 2;
    let y = M;

    // Left accent bar
    doc.rect(0, 0, 8, PH).fill(primary);

    // Header band
    doc.rect(8, 0, PW - 8, 88).fill(ink);
    const logoSize = 46;
    if (B.logoPath) {
      drawLogoCircular(doc, B.logoPath, M + logoSize / 2 + 4, 21, logoSize);
    } else {
      doc.circle(M + logoSize / 2 + 4, 21 + logoSize / 2, logoSize / 2).fill(primary);
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(WHITE)
        .text((B.name || 'P').charAt(0).toUpperCase(), M + 4, 32, { width: logoSize, align: 'center' });
    }

    const headX = M + logoSize + 18;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE).text(B.name || 'Company', headX, 24, {
      width: 240,
    });
    doc.font('Helvetica').fontSize(8).fillColor('#c5d4ce');
    const contact = [B.phone, B.email].filter(Boolean).join('  ·  ');
    if (B.tagline) doc.text(B.tagline, headX, 44, { width: 240 });
    if (contact) doc.text(contact, headX, B.tagline ? 56 : 44, { width: 240 });

    doc.font('Helvetica-Bold').fontSize(18).fillColor(WHITE).text(docTitle, PW - M - 180, 28, {
      width: 180,
      align: 'right',
    });
    doc.font('Helvetica').fontSize(9).fillColor('#c5d4ce').text(`# ${inv.invoice_no || '—'}`, PW - M - 180, 52, {
      width: 180,
      align: 'right',
    });

    y = 108;

    // Meta chips
    const chipW = contentW / 3;
    const chips = [
      { label: 'Date', value: fmtDate(inv.sale_date) },
      { label: 'Payment', value: String(inv.payment_mode || 'Cash').toUpperCase() },
      { label: 'Status', value: String(inv.status || 'Paid').toUpperCase() },
    ];
    chips.forEach((chip, i) => {
      const x = M + i * chipW;
      doc.roundedRect(x + (i ? 4 : 0), y, chipW - 8, 42, 8).fill(soft);
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(chip.label, x + 12, y + 8);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(chip.value, x + 12, y + 22, {
        width: chipW - 28,
      });
    });
    y += 58;

    // Bill to
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('BILL TO', M, y);
    y += 12;
    y = blockLines(doc, billLines, M, y, contentW * 0.55) + 16;

    // Table header
    const colNum = 28;
    const colQty = 48;
    const colRate = 78;
    const colAmt = 82;
    const colDesc = contentW - colNum - colQty - colRate - colAmt;

    doc.roundedRect(M, y, contentW, 24, 6).fill(primary);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE);
    doc.text('#', M + 6, y + 8, { width: colNum - 8, align: 'center' });
    doc.text('Item', M + colNum + 6, y + 8, { width: colDesc - 10 });
    doc.text('Qty', M + colNum + colDesc, y + 8, { width: colQty, align: 'center' });
    doc.text('Rate', M + colNum + colDesc + colQty, y + 8, { width: colRate - 6, align: 'right' });
    doc.text('Amount', M + colNum + colDesc + colQty + colRate, y + 8, {
      width: colAmt - 8,
      align: 'right',
    });
    y += 28;

    items.forEach((it, idx) => {
      const name = it.product_name || '—';
      const qty = Number(it.quantity || 0);
      const price = Number(it.unit_price || 0);
      const amt = Number(it.line_total != null ? it.line_total : qty * price);
      const rowH = 26;
      if (idx % 2 === 1) {
        doc.rect(M, y, contentW, rowH).fill('#f7faf8');
      }
      doc.font('Helvetica').fontSize(9).fillColor(DARK);
      doc.text(String(idx + 1), M + 6, y + 8, { width: colNum - 8, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(9).text(name, M + colNum + 6, y + 8, {
        width: colDesc - 10,
        ellipsis: true,
      });
      doc.font('Helvetica').fontSize(9);
      doc.text(qty % 1 === 0 ? String(qty) : qty.toFixed(2), M + colNum + colDesc, y + 8, {
        width: colQty,
        align: 'center',
      });
      doc.text(money(price), M + colNum + colDesc + colQty, y + 8, {
        width: colRate - 6,
        align: 'right',
      });
      doc.text(money(amt), M + colNum + colDesc + colQty + colRate, y + 8, {
        width: colAmt - 8,
        align: 'right',
      });
      y += rowH;
    });

    if (!items.length) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('No items', M + 12, y + 8);
      y += 28;
    }

    y += 14;
    const totalsW = 230;
    const totalsX = PW - M - totalsW;

    const drawTotal = (label, value, opts = {}) => {
      const h = opts.strong ? 28 : 18;
      if (opts.strong) doc.roundedRect(totalsX, y, totalsW, h, 8).fill(primary);
      doc
        .font(opts.strong ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(opts.strong ? 11 : 9)
        .fillColor(opts.strong ? WHITE : DARK);
      doc.text(label, totalsX + 12, y + (opts.strong ? 8 : 4), { width: 100 });
      doc.text(value, totalsX + 110, y + (opts.strong ? 8 : 4), {
        width: totalsW - 122,
        align: 'right',
      });
      y += h + (opts.strong ? 0 : 2);
    };

    drawTotal('Subtotal', money(subtotal));
    if (discAmt > 0) drawTotal('Discount', `-${money(discAmt)}`);
    if (returned > 0) drawTotal('Returns', `-${money(returned)}`);
    if (taxAmt > 0) drawTotal('Tax', money(taxAmt));
    y += 4;
    drawTotal('Total due', money(netAmt), { strong: true });
    y += 8;
    if (paid > 0) drawTotal('Paid', money(paid));
    if (remaining > 0) drawTotal('Balance', money(remaining));

    const footY = Math.max(y + 36, PH - M - 70);
    doc.moveTo(M, footY).lineTo(PW - M, footY).lineWidth(0.8).strokeColor(LINE).stroke();
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(B.footerText || 'Thank you for your business.', M, footY + 12, { width: contentW * 0.65 });
    const reg = [B.gstin && `GSTIN ${B.gstin}`, B.regNumber && `Reg ${B.regNumber}`]
      .filter(Boolean)
      .join('  ·  ');
    if (reg) {
      doc.fontSize(7.5).text(reg, M, footY + 28, { width: contentW });
    }
    if (B.address) {
      doc
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(B.address, PW - M - 200, footY + 12, { width: 200, align: 'right' });
    }

    doc.end();
    ws.on('finish', () => resolve(filepath));
    ws.on('error', reject);
  });
}

module.exports = { generate };
