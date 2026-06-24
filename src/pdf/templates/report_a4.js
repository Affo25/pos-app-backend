const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { TMP_DIR } = require('../paths');
const { money, drawLogoCircular } = require('../shared');

const PW = 595.28;
const PH = 841.89;
const M = 48;

const GREEN = '#34A853';
const GREEN_LIGHT = '#E8F5E9';
const BW_PRIMARY = '#374151';
const BW_PRIMARY_LIGHT = '#f3f4f6';
const GREY_BG = '#F5F5F5';
const DARK = '#1f2937';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const WHITE = '#ffffff';

function resolvePalette(B) {
  if (B && B.printGrayscale) {
    return { primary: BW_PRIMARY, primaryLight: BW_PRIMARY_LIGHT };
  }
  return { primary: B?.accent || GREEN, primaryLight: GREEN_LIGHT };
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function addDays(d, days) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setDate(dt.getDate() + days);
  return dt;
}

function blockLines(doc, lines, x, y, w, opts = {}) {
  const size = opts.size || 9;
  const color = opts.color || DARK;
  const boldFirst = opts.boldFirst !== false;
  doc.fillColor(color);
  let cy = y;
  (lines || []).filter((l) => l != null && String(l).trim()).forEach((line, i) => {
    doc.font(i === 0 && boldFirst ? 'Helvetica-Bold' : 'Helvetica').fontSize(i === 0 && boldFirst ? 10 : size);
    doc.text(String(line), x, cy, { width: w });
    cy += (i === 0 && boldFirst ? 12 : size + 4);
  });
  return cy;
}

/**
 * Modern green A4 invoice (Zylker-style).
 */
function generate(inv, B) {
  return new Promise((resolve, reject) => {
    const filename = `invoice-${(inv.invoice_no || Date.now()).toString().replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const filepath = path.join(TMP_DIR, filename);

    const doc = new PDFDocument({ size: 'A4', margin: M });
    const ws = fs.createWriteStream(filepath);
    doc.pipe(ws);

    const { primary, primaryLight } = resolvePalette(B);

    const items = inv.items || [];
    const subtotal = Number(inv.total_amount || 0);
    const discAmt = Number(inv.discount_amount || 0);
    const taxAmt = Number(inv.tax_amount || 0);
    const returned = Number(inv.returned_total || 0);
    const netAmt = Number(
      inv.net_amount != null ? inv.net_amount : Math.max(0, subtotal - discAmt + taxAmt - returned),
    );
    const paid = Number(inv.amount_paid || 0);
    const remaining = Number(
      inv.amount_remaining != null ? inv.amount_remaining : Math.max(0, netAmt - paid),
    );

    const docTitle = String(inv.document_title || 'INVOICE').trim().toUpperCase() || 'INVOICE';
    const saleDate = inv.sale_date || Date.now();
    const terms = inv.payment_terms || 'Due on receipt';
    const dueDate = inv.due_date || addDays(saleDate, 30) || saleDate;
    const taxRate =
      inv.tax_rate_percent != null
        ? String(inv.tax_rate_percent)
        : subtotal > 0
          ? ((taxAmt / subtotal) * 100).toFixed(2)
          : '0';

    const billLines =
      inv.bill_to_lines ||
      [inv.customer_name || 'Walk-in Customer', inv.customer_address, inv.customer_phone].filter(Boolean);
    const shipLines = inv.ship_to_lines || billLines;

    let y = M;
    const contentW = PW - M * 2;

    // —— Header: logo left, company right ——
    const logoSize = 52;
    if (B.logoPath) {
      drawLogoCircular(doc, B.logoPath, M + logoSize / 2, y, logoSize);
    } else {
      doc.circle(M + logoSize / 2, y + logoSize / 2, logoSize / 2).fill(primary);
      doc.font('Helvetica-Bold').fontSize(22).fillColor(WHITE);
      const initial = (B.name || 'Z').charAt(0).toUpperCase();
      doc.text(initial, M + logoSize / 2 - 8, y + logoSize / 2 - 12, { width: 16, align: 'center' });
    }

    const coX = PW - M - 220;
    const coW = 220;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text(B.name || 'Company', coX, y, {
      width: coW,
      align: 'right',
    });
    let coY = y + 16;
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);
    if (B.address) {
      doc.text(B.address, coX, coY, { width: coW, align: 'right', lineGap: 1 });
      coY += doc.heightOfString(B.address, { width: coW }) + 2;
    }
    const coContact = [B.phone, B.email].filter(Boolean).join('  ·  ');
    if (coContact) {
      doc.text(coContact, coX, coY, { width: coW, align: 'right' });
    }

    y = Math.max(y + logoSize + 16, coY + 20);

    // —— INVOICE title with side lines ——
    const titleY = y + 6;
    const titleText = docTitle;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(DARK);
    const titleW = doc.widthOfString(titleText);
    const centerX = PW / 2;
    const linePad = 12;
    const lineY = titleY + 6;
    doc.moveTo(M, lineY).lineTo(centerX - titleW / 2 - linePad, lineY).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.moveTo(centerX + titleW / 2 + linePad, lineY).lineTo(PW - M, lineY).stroke();
    doc.text(titleText, 0, titleY, { width: PW, align: 'center' });
    y = titleY + 28;

    // —— Bill / Ship / Invoice# ——
    const leftW = contentW * 0.55;
    const invNoX = PW - M - 140;

    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Bill To', M, y);
    doc.text('Ship To', M + leftW / 2 + 8, y);
    y += 12;

    const addrStart = y;
    const afterBill = blockLines(doc, billLines, M, addrStart, leftW / 2 - 8, { boldFirst: true, size: 9 });
    const afterShip = blockLines(doc, shipLines, M + leftW / 2 + 8, addrStart, leftW / 2 - 8, {
      boldFirst: true,
      size: 9,
    });
    y = Math.max(afterBill, afterShip);

    const refLabel = inv.reference_label || 'Invoice#';
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(refLabel, invNoX, addrStart);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(DARK).text(String(inv.invoice_no || '—'), invNoX, addrStart + 12);

    y += 20;

    // —— Meta table (Date / Terms / Due) ——
    const metaCols = 3;
    const metaColW = contentW / metaCols;
    const metaH = 22;
    const metaRowH = 24;

    for (let c = 0; c < metaCols; c += 1) {
      doc.rect(M + c * metaColW, y, metaColW, metaH).fill(primary);
    }
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE);
    doc.text('Invoice Date', M, y + 7, { width: metaColW, align: 'center' });
    doc.text('Terms', M + metaColW, y + 7, { width: metaColW, align: 'center' });
    doc.text('Due Date', M + metaColW * 2, y + 7, { width: metaColW, align: 'center' });
    y += metaH;

    for (let c = 0; c < metaCols; c += 1) {
      doc.rect(M + c * metaColW, y, metaColW, metaRowH).strokeColor(LINE).lineWidth(0.5).stroke();
    }
    doc.font('Helvetica').fontSize(9).fillColor(DARK);
    doc.text(fmtDate(saleDate), M, y + 7, { width: metaColW, align: 'center' });
    doc.text(terms, M + metaColW, y + 7, { width: metaColW, align: 'center' });
    doc.text(fmtDate(dueDate), M + metaColW * 2, y + 7, { width: metaColW, align: 'center' });
    y += metaRowH + 18;

    // —— Line items ——
    const colNum = 28;
    const colQty = 52;
    const colRate = 72;
    const colAmt = 78;
    const colDesc = contentW - colNum - colQty - colRate - colAmt;
    const tableX = M;

    const drawHeaderCell = (text, x, w, align = 'left') => {
      doc.text(text, x + 4, y + 7, { width: w - 8, align });
    };

    doc.rect(tableX, y, contentW, metaH).fill(primary);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE);
    drawHeaderCell('#', tableX, colNum, 'center');
    drawHeaderCell('Item & Description', tableX + colNum, colDesc);
    drawHeaderCell('Qty', tableX + colNum + colDesc, colQty, 'center');
    drawHeaderCell('Rate', tableX + colNum + colDesc + colQty, colRate, 'right');
    drawHeaderCell('Amount', tableX + colNum + colDesc + colQty + colRate, colAmt, 'right');
    y += metaH;

    items.forEach((it, idx) => {
      const name = it.product_name || '—';
      const desc = it.description || it.product_description || '';
      const qty = Number(it.quantity || 0);
      const price = Number(it.unit_price || 0);
      const amt = Number(it.line_total != null ? it.line_total : qty * price);

      const rowBase = Math.max(28, desc ? 38 : 28);
      if (idx > 0) {
        doc.moveTo(tableX, y).lineTo(tableX + contentW, y).lineWidth(0.5).strokeColor(LINE).stroke();
      }

      doc.font('Helvetica').fontSize(9).fillColor(DARK);
      doc.text(String(idx + 1), tableX + 4, y + 8, { width: colNum - 8, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(9).text(name, tableX + colNum + 4, y + 6, { width: colDesc - 8 });
      let descY = y + 18;
      if (desc) {
        doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(desc, tableX + colNum + 4, descY, {
          width: colDesc - 8,
        });
        descY += 12;
      }

      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK);
      doc.text(qty % 1 === 0 ? String(qty) : qty.toFixed(2), tableX + colNum + colDesc, y + 8, {
        width: colQty,
        align: 'center',
      });

      doc.font('Helvetica').fontSize(9).fillColor(DARK);
      doc.text(money(price), tableX + colNum + colDesc + colQty, y + 8, {
        width: colRate - 4,
        align: 'right',
      });
      doc.text(money(amt), tableX + colNum + colDesc + colQty + colRate, y + 8, {
        width: colAmt - 6,
        align: 'right',
      });

      y += rowBase;
    });

    if (!items.length) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('No items', tableX + colNum + 4, y + 8);
      y += 28;
    }

    y += 16;

    // —— Thanks ——
    doc.font('Helvetica').fontSize(10).fillColor(DARK).text('Thanks for your business.', M, y);
    y += 24;

    // —— Totals (right) ——
    const totalsW = 220;
    const totalsX = PW - M - totalsW;
    const labelW = 110;
    const valX = totalsX + labelW;

    const drawTotalRow = (label, value, opts = {}) => {
      const rowH = opts.highlight ? 26 : 18;
      if (opts.highlight) {
        doc.rect(totalsX, y, totalsW, rowH).fill(primaryLight);
      } else if (opts.shade) {
        doc.rect(totalsX, y, totalsW, rowH).fill(GREY_BG);
      }
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(opts.bold ? 10 : 9)
        .fillColor(DARK);
      doc.text(label, totalsX + 8, y + (opts.highlight ? 7 : 4), { width: labelW - 12 });
      doc.text(value, valX, y + (opts.highlight ? 7 : 4), { width: totalsW - labelW - 8, align: 'right' });
      y += rowH;
    };

    const totalsStartY = y;
    drawTotalRow('Sub Total', money(subtotal), { shade: true });
    if (discAmt > 0) {
      drawTotalRow('Discount', `-${money(discAmt)}`, { shade: true });
    }
    if (returned > 0) {
      drawTotalRow('Returns', `-${money(returned)}`, { shade: true });
    }
    if (taxAmt > 0) {
      drawTotalRow('Tax Rate', `${taxRate}%`, { shade: true });
    }
    drawTotalRow('Total', money(netAmt), { bold: true });
    drawTotalRow('Amount Paid', money(paid), { shade: true });
    drawTotalRow('Amount Remaining', money(remaining), { bold: true, highlight: true });

    // Push terms below totals if needed
    const termsY = Math.max(totalsStartY + 120, PH - M - 100);
    y = termsY;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text('Terms & Conditions', M, y);
    y += 14;
    const termsText =
      B.footerText ||
      inv.terms_text ||
      'Full payment is due upon receipt of this invoice. Late payments may incur additional charges or interest as per the applicable laws.';
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(termsText, M, y, { width: contentW * 0.65, lineGap: 2 });

    if (B.gstin || B.regNumber) {
      y += 36;
      const reg = [B.gstin && `GSTIN: ${B.gstin}`, B.regNumber && `Reg: ${B.regNumber}`].filter(Boolean).join('  ·  ');
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(reg, M, y, { width: contentW });
    }

    doc.end();
    ws.on('finish', () => resolve(filepath));
    ws.on('error', reject);
  });
}

module.exports = { generate };
