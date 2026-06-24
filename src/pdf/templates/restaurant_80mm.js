const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { TMP_DIR } = require('../paths');
const {
  C,
  MM_TO_PT,
  RECEIPT_WIDTH_MM,
  money,
  drawLogoCircular,
} = require('../shared');

const BAR_GREY = '#f3f4f6';
const HEADER_TABLE = '#374151';
const FOOTER_MUTED = '#9ca3af';

/**
 * 80mm thermal receipt — layout aligned to full invoice style (header, grey bill bar,
 * dark table head # / Item / Qty / Price / Total, totals, thank-you footer).
 */
function generate(inv, B) {
  return new Promise((resolve, reject) => {
    const filename = `invoice-${(inv.invoice_no || Date.now()).toString().replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const filepath = path.join(TMP_DIR, filename);

    const items = inv.items || [];
    const subtotal = Number(inv.total_amount || 0);
    const discAmt = Number(inv.discount_amount || 0);
    const taxAmt = Number(inv.tax_amount || 0);
    const netAmt = Number(inv.net_amount || 0);

    const saleDate = new Date(inv.sale_date || Date.now());
    const fmtDate = saleDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const fmtTime = saleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const fmtDateLine = `${fmtDate} | ${fmtTime}`;

    const paymentMode = (inv.payment_mode || 'cash').toString();
    const typeLabel = paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1).toLowerCase();
    const customerName = inv.customer_name || 'Walk-in';

    const wPt = RECEIPT_WIDTH_MM * MM_TO_PT;
    const side = 10;
    const innerW = wPt - 2 * side;
    const cx = side + innerW / 2;

    const wNum = 14;
    const wQty = 22;
    const wPrice = 48;
    const wTotal = 50;
    const wItem = Math.max(36, innerW - wNum - wQty - wPrice - wTotal);
    const xNum = side;
    const xItem = xNum + wNum;
    const xQty = xItem + wItem;
    const xPrice = xQty + wQty;
    const xTotal = xPrice + wPrice;

    const estH =
      36 +
      (B.logoPath ? 52 : 0) +
      88 +
      42 +
      22 +
      items.length * 36 +
      100 +
      52;

    const pageH = Math.min(72 * 72, Math.max(72 * 16, estH));
    const doc = new PDFDocument({ size: [wPt, pageH], margin: 0, bufferPages: true });
    const ws = fs.createWriteStream(filepath);
    doc.pipe(ws);

    let y = side;
    const bottom = () => doc.page.height - side;

    const newPage = () => {
      doc.addPage({ size: [wPt, 72 * 40], margin: 0 });
      y = side;
    };

    const ensureSpace = (h) => {
      if (y + h <= bottom()) return;
      newPage();
    };

    const fillRect = (x, yy, w, h, hex) => {
      doc.save().fillColor(hex).rect(x, yy, w, h).fill().restore();
    };

    const hr = (yy, col = '#e5e7eb', lw = 0.4) => {
      doc.moveTo(side, yy).lineTo(side + innerW, yy).lineWidth(lw).strokeColor(col).stroke();
    };

    /* ── Header (centered) ── */
    if (B.logoPath) {
      ensureSpace(50);
      y = drawLogoCircular(doc, B.logoPath, cx, y, 40);
      y += 4;
    }

    ensureSpace(28);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.dark).text(B.name || 'Company', side, y, { width: innerW, align: 'center' });
    y = doc.y + 3;
    if (B.tagline) {
      doc.fontSize(7.5).font('Helvetica').fillColor(C.mid).text(B.tagline, side, y, { width: innerW, align: 'center' });
      y = doc.y + 2;
    }
    const addrLines = (() => {
      const raw = (B.address || '').trim();
      if (!raw) return [];
      const byNl = raw.split(/\n/).map((s) => s.trim()).filter(Boolean);
      return byNl.length > 1 ? byNl.slice(0, 3) : [raw];
    })();
    doc.fontSize(7).fillColor(C.dark);
    addrLines.forEach((line) => {
      doc.text(line, side, y, { width: innerW, align: 'center' });
      y = doc.y + 1;
    });
    if (B.phone) {
      doc.text(B.phone, side, y, { width: innerW, align: 'center' });
      y = doc.y + 1;
    }
    if (B.email) {
      doc.text(B.email, side, y, { width: innerW, align: 'center' });
      y = doc.y + 1;
    }
    y += 3;
    doc.fontSize(7.5).font('Helvetica').fillColor(C.mid).text(fmtDateLine, side, y, { width: innerW, align: 'center' });
    y = doc.y + 8;
    hr(y, '#e5e7eb');
    y += 6;

    /* ── Grey bar: BILL TO | INVOICE ── */
    const barH = 40;
    ensureSpace(barH + 8);
    fillRect(side, y, innerW, barH, BAR_GREY);
    const barY = y;
    const mid = side + innerW / 2;
    const colPad = 6;
    doc.fontSize(6.5).font('Helvetica').fillColor(C.muted).text('BILL TO', side + colPad, barY + 6, { width: innerW / 2 - colPad * 2, align: 'left' });
    doc.text('INVOICE', mid + colPad, barY + 6, { width: innerW / 2 - colPad * 2, align: 'left' });
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.dark);
    doc.text(customerName, side + colPad, barY + 16, { width: innerW / 2 - colPad * 2, align: 'left' });
    doc.text(inv.invoice_no || '—', mid + colPad, barY + 16, { width: innerW / 2 - colPad * 2, align: 'left' });
    doc.fontSize(7).font('Helvetica').fillColor(C.mid).text(`Payment: ${typeLabel.toUpperCase()}`, mid + colPad, barY + 28, {
      width: innerW / 2 - colPad * 2,
      align: 'left',
    });
    y = barY + barH + 6;

    /* ── Table header (charcoal + white) ── */
    const th = 15;
    ensureSpace(th + 6);
    fillRect(side, y, innerW, th, HEADER_TABLE);
    const hy = y;
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C.white);
    doc.text('#', xNum, hy + 3, { width: wNum - 1, align: 'center' });
    doc.text('Item', xItem, hy + 3, { width: wItem - 2, align: 'left' });
    doc.text('Qty', xQty, hy + 3, { width: wQty, align: 'center' });
    doc.text('Price', xPrice, hy + 3, { width: wPrice - 2, align: 'right' });
    doc.text('Total', xTotal, hy + 3, { width: wTotal, align: 'right' });
    y = hy + th;
    hr(y, '#e5e7eb');
    y += 2;

    /* ── Rows ── */
    items.forEach((it, idx) => {
      const name = it.product_name || '—';
      const qty = Number(it.quantity || 0);
      const unit = Number(it.unit_price || 0);
      const line = Number(it.line_total != null ? it.line_total : qty * unit);
      const rowPad = 3;
      const nameH = doc.heightOfString(name, { width: wItem - 2, lineGap: 0.5 });
      const rowH = Math.max(16, nameH + rowPad * 2);
      ensureSpace(rowH + 4);
      if (idx % 2 === 1) {
        fillRect(side, y, innerW, rowH, '#fafafa');
      }
      const ry = y + rowPad;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(C.dark).text(String(idx + 1), xNum, ry, { width: wNum - 1, align: 'center' });
      doc.font('Helvetica').text(name, xItem, ry, { width: wItem - 2, align: 'left' });
      doc.text(String(qty), xQty, ry, { width: wQty, align: 'center' });
      doc.text(money(unit), xPrice, ry, { width: wPrice - 2, align: 'right' });
      doc.font('Helvetica-Bold').text(money(line), xTotal, ry, { width: wTotal, align: 'right' });
      y += rowH;
      hr(y, '#f3f4f6', 0.25);
      y += 1;
    });

    if (items.length === 0) {
      ensureSpace(20);
      doc.fontSize(8).font('Helvetica').fillColor(C.muted).text('No line items', side, y, { width: innerW, align: 'center' });
      y = doc.y + 10;
    }

    y += 4;
    hr(y, C.dark, 0.6);
    y += 6;

    /* ── Totals (right-aligned block) ── */
    const labelW = innerW * 0.52;
    const valW = innerW * 0.48;
    const valX = side + labelW;
    const rowTot = (label, val, opt = {}) => {
      const { bold = false, big = false } = opt;
      ensureSpace(big ? 16 : 13);
      doc.fontSize(big ? 9 : 7.5).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(C.dark);
      doc.text(label, side, y, { width: labelW - 4, align: 'right' });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(val, valX, y, { width: valW, align: 'right' });
      y = doc.y + (big ? 4 : 3);
    };

    rowTot('Subtotal', money(subtotal));
    if (discAmt > 0) rowTot('Discount', `−${money(discAmt)}`);
    rowTot('Tax', money(taxAmt));
    y += 2;
    hr(y, '#d1d5db', 0.5);
    y += 5;
    rowTot('Grand Total', money(netAmt), { bold: true, big: true });

    y += 10;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.dark).text(B.footerText || 'Thank you for your business!', side, y, {
      width: innerW,
      align: 'center',
    });
    y = doc.y + 6;
    doc.fontSize(6).font('Helvetica').fillColor(FOOTER_MUTED).text('This is a computer-generated invoice.', side, y, {
      width: innerW,
      align: 'center',
    });
    y = doc.y + side;

    doc.end();
    ws.on('finish', () => resolve(filepath));
    ws.on('error', reject);
  });
}

module.exports = { generate };
