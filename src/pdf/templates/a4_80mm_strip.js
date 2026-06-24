const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { TMP_DIR } = require('../paths');
const {
  C,
  MM_TO_PT,
  RECEIPT_WIDTH_MM,
  money,
  parseAmount,
  dottedRule,
  thickDashedRule,
  vDottedLine,
  solidRuleBlack,
  drawLogoCircular,
} = require('../shared');

/** Slip size: 80 mm wide × 210 mm tall (per page; extra pages if needed). */
const PAGE_HEIGHT_MM = 210;

const DEFAULT_POWERED = 'Code5 Tech';
const DEFAULT_WEB = 'www.code5.com.pk';

/**
 * 80×210 mm strip invoice — same visual system as restaurant_80mm (bill block,
 * Item Name | Qty | Rate | Service | Amount, totals ladder, powered-by footer).
 * @returns {Promise<string>} absolute filepath to generated PDF
 */
function generate(inv, B) {
  return new Promise((resolve, reject) => {
    const filename = `invoice-${(inv.invoice_no || Date.now()).toString().replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const filepath = path.join(TMP_DIR, filename);

    const items = inv.items || [];
    const outTotal = parseAmount(inv.total_amount);
    const extraCharges = parseAmount(inv.extra_charges ?? inv.service_charge ?? 0);
    const discAmt = parseAmount(inv.discount_amount);
    const taxAmt = parseAmount(inv.tax_amount);
    const netAmt = parseAmount(inv.net_amount);
    const saleDate = new Date(inv.sale_date || Date.now());
    const fmtDate = saleDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const fmtTime = saleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const fmtDateRight = `${fmtDate} ${fmtTime}`;

    const paymentMode = (inv.payment_mode || 'cash').toString();
    const typeLabel = paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1).toLowerCase();
    const customerName = inv.customer_name || 'Walk-in';
    const notesRaw = (inv.notes || inv.project_detail || '').toString().trim();
    const notesDisplay = notesRaw || '—';

    const tender = parseAmount(inv.amount_tendered ?? inv.amount_paid ?? inv.tender ?? netAmt);
    const isCash = String(inv.payment_mode || 'cash').toLowerCase() === 'cash';
    const changeBack = isCash ? Math.max(0, tender - netAmt) : null;

    const wPt = RECEIPT_WIDTH_MM * MM_TO_PT;
    const pageH = PAGE_HEIGHT_MM * MM_TO_PT;
    const side = 12;
    const innerW = wPt - 2 * side;
    const cx = side + innerW / 2;

    const colItem = innerW * 0.36;
    const colQty = innerW * 0.1;
    const colRate = innerW * 0.18;
    const colSvc = innerW * 0.15;
    const colAmt = innerW * 0.21;
    const xL = side;
    const xQty = xL + colItem;
    const xRate = xQty + colQty;
    const xSvc = xRate + colRate;
    const xAmt = xSvc + colSvc;

    const doc = new PDFDocument({ size: [wPt, pageH], margin: 0, bufferPages: true });
    const ws = fs.createWriteStream(filepath);
    doc.pipe(ws);

    let y = side;
    const yReceiptTop = 6;
    let pageCount = 1;
    const bottom = () => doc.page.height - side;

    const state = { inItems: false };

    /** Table header only — caller must ensure vertical space (no ensureSpace here). */
    const drawItemTableHeaderCore = () => {
      const th = 14;
      const tableTop = y;
      y = solidRuleBlack(doc, side, side + innerW, tableTop);
      const headerY = y;
      doc.fontSize(7.2).font('Helvetica-Bold').fillColor(C.dark);
      doc.text('Item Name', xL, headerY + 2, { width: colItem - 1, align: 'left' });
      doc.text('Qty', xQty, headerY + 2, { width: colQty, align: 'center' });
      doc.text('Rate', xRate, headerY + 2, { width: colRate - 1, align: 'right' });
      doc.text('Service', xSvc, headerY + 2, { width: colSvc - 1, align: 'right' });
      doc.text('Amount', xAmt, headerY + 2, { width: colAmt, align: 'right' });
      const headerBot = headerY + th;
      vDottedLine(doc, xQty, headerY, headerBot);
      vDottedLine(doc, xRate, headerY, headerBot);
      vDottedLine(doc, xSvc, headerY, headerBot);
      vDottedLine(doc, xAmt, headerY, headerBot);
      y = solidRuleBlack(doc, side, side + innerW, headerBot);
    };

    const newPage = () => {
      doc.addPage({ size: [wPt, pageH], margin: 0 });
      pageCount += 1;
      y = side;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C.mid);
      doc.text(`(continued) ${inv.invoice_no || '—'}`, side, y, { width: innerW, align: 'center' });
      y = doc.y + 6;
      y = dottedRule(doc, side, side + innerW, y);
      if (state.inItems) {
        drawItemTableHeaderCore();
      }
    };

    const ensureSpace = (h) => {
      if (y + h <= bottom()) return;
      newPage();
    };

    const addrLines = (() => {
      const raw = (B.address || '').trim();
      if (!raw) return [];
      const byNl = raw.split(/\n/).map((s) => s.trim()).filter(Boolean);
      if (byNl.length > 1) return byNl.slice(0, 3);
      return [raw];
    })();

    if (B.logoPath) {
      ensureSpace(52);
      y = drawLogoCircular(doc, B.logoPath, cx, y, 44);
    }

    ensureSpace(40);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.dark).text(B.name, side, y, { width: innerW, align: 'center' });
    y = doc.y + 4;
    doc.fontSize(8).font('Helvetica').fillColor(C.dark);
    addrLines.forEach((line) => {
      doc.text(line, side, y, { width: innerW, align: 'center' });
      y = doc.y + 2;
    });
    if (B.phone) {
      doc.text(B.phone, side, y, { width: innerW, align: 'center' });
      y = doc.y + 3;
    }
    y += 4;
    y = dottedRule(doc, side, side + innerW, y);

    ensureSpace(22);
    y = solidRuleBlack(doc, side, side + innerW, y);
    doc.fontSize(8).font('Helvetica').fillColor(C.dark);
    const billRow1 = y;
    doc.text(`Bill No: ${inv.invoice_no || '—'}`, side, billRow1, { width: innerW * 0.62, align: 'left' });
    doc.text(fmtDateRight, side, billRow1, { width: innerW, align: 'right' });
    y = billRow1 + 12;
    y = solidRuleBlack(doc, side, side + innerW, y);

    const billRow2 = y;
    doc.text(`Type: ${typeLabel}`, side, billRow2, { width: innerW * 0.5, align: 'left' });
    doc.text(`Customer : ${customerName}`, side, billRow2, { width: innerW, align: 'right' });
    y = billRow2 + 12;
    y = solidRuleBlack(doc, side, side + innerW, y);

    ensureSpace(20);
    doc.fontSize(8).font('Helvetica').fillColor(C.dark);
    doc.text(`Notes: ${notesDisplay}`, side, y, { width: innerW, align: 'left' });
    y = doc.y + 4;
    y = solidRuleBlack(doc, side, side + innerW, y);
    y += 2;

    state.inItems = true;
    ensureSpace(22);
    drawItemTableHeaderCore();

    items.forEach((it) => {
      const name = it.product_name || '—';
      const qty = parseAmount(it.quantity);
      const unit = parseAmount(it.unit_price);
      const line =
        it.line_total != null && it.line_total !== ''
          ? parseAmount(it.line_total)
          : qty * unit;
      const lineTax = parseAmount(it.tax);

      ensureSpace(30);
      const rowTop = y;
      doc.fontSize(7.8).font('Helvetica').fillColor(C.dark);
      const nameOpts = { width: colItem - 2, align: 'left', lineGap: 0.5 };
      const nameBlockH = Math.max(11, doc.heightOfString(name, nameOpts));
      doc.text(name, xL, rowTop, nameOpts);
      const secondY = rowTop + nameBlockH + 1;
      doc.fontSize(7.5).font('Helvetica');
      const moneyCell = (txt, x, w, bold) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(txt, x, secondY, { width: w, align: 'right', lineBreak: false });
      };
      doc.text(String(qty), xQty, secondY, { width: colQty, align: 'center', lineBreak: false });
      moneyCell(money(unit), xRate, colRate - 1, false);
      moneyCell(money(lineTax), xSvc, colSvc - 1, false);
      moneyCell(money(line), xAmt, colAmt, true);
      y = secondY + 12;
    });

    state.inItems = false;

    if (items.length === 0) {
      ensureSpace(18);
      doc.fontSize(8).font('Helvetica').fillColor(C.muted).text('No items', side, y, { width: innerW, align: 'center' });
      y = doc.y + 10;
    }

    y = solidRuleBlack(doc, side, side + innerW, y);
    y += 4;

    const splitX = side + innerW * 0.56;
    const totalRow = (label, val, opts = {}) => {
      const { bold = false, size = 8 } = opts;
      ensureSpace(16);
      y = dottedRule(doc, side, side + innerW, y);
      const ry = y;
      const f = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.fontSize(size).font(f).fillColor(C.dark);
      doc.text(label, side, ry, { width: splitX - side - 4, align: 'left' });
      vDottedLine(doc, splitX, ry, ry + 11);
      doc.font(f).text(val, splitX + 3, ry, {
        width: side + innerW - (splitX + 3),
        align: 'right',
        lineBreak: false,
      });
      y = ry + 12;
    };

    totalRow('Out Total', money(outTotal));
    totalRow('Extra Charges', money(extraCharges));
    totalRow('Discount/Promotion', discAmt > 0 ? `\u2212\u00a0${money(discAmt)}` : money(0));
    totalRow('Total GST', money(taxAmt));
    totalRow('Net Total', money(netAmt), { bold: true, size: 9 });
    totalRow('Amount Paid', money(tender));
    totalRow('Change back (Cash)', changeBack != null ? money(changeBack) : '—');

    y += 4;
    y = thickDashedRule(doc, side, side + innerW, y);
    y += 6;

    const poweredBrand = (B.receiptPoweredBy && String(B.receiptPoweredBy).trim()) || DEFAULT_POWERED;
    ensureSpace(36);
    doc.fontSize(8).font('Helvetica').fillColor(C.dark);
    const pre = 'powered by ';
    doc.font('Helvetica');
    const wPre = doc.widthOfString(pre);
    doc.font('Helvetica-Bold');
    const wBrand = doc.widthOfString(poweredBrand);
    const startPowered = cx - (wPre + wBrand) / 2;
    doc.font('Helvetica').text(pre, startPowered, y, { continued: true, lineBreak: false });
    doc.font('Helvetica-Bold').text(poweredBrand, { lineBreak: false });
    y = doc.y + 5;
    const web = (B.receiptWebsite && String(B.receiptWebsite).trim()) || DEFAULT_WEB;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.mid).text(web, side, y, { width: innerW, align: 'center' });
    y = doc.y + 10;

    /* Single-page slip: outer frame. Multi-page: skip full frame (each page is already 80×210). */
    if (pageCount === 1) {
      const borderPad = 3;
      const hBorder = y - yReceiptTop + borderPad;
      doc.rect(borderPad, yReceiptTop, wPt - 2 * borderPad, hBorder).lineWidth(0.55).strokeColor('#000000').stroke();
    }

    doc.end();
    ws.on('finish', () => resolve(filepath));
    ws.on('error', reject);
  });
}

module.exports = { generate };
