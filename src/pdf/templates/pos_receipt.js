const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { TMP_DIR } = require('../paths');
const { MM_TO_PT, RECEIPT_WIDTH_MM, parseAmount, money, drawLogoCircular } = require('../shared');

/**
 * POS thermal receipt inspired by classic monochrome market slips.
 * Designed for 80mm paper with dense line-items and compact totals.
 */
function generate(inv, B) {
  return new Promise((resolve, reject) => {
    const filename = `invoice-${(inv.invoice_no || Date.now()).toString().replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const filepath = path.join(TMP_DIR, filename);

    const items = Array.isArray(inv.items) ? inv.items : [];
    const subtotal = parseAmount(inv.total_amount);
    const discount = parseAmount(inv.discount_amount);
    const tax = parseAmount(inv.tax_amount);
    const net = parseAmount(inv.net_amount);
    const paid = parseAmount(inv.amount_tendered ?? inv.amount_paid ?? inv.amount_received ?? net);
    const paymentMode = String(inv.payment_mode || 'cash').toUpperCase();
    const change = paymentMode === 'CASH' ? Math.max(0, paid - net) : 0;
    const customer = inv.customer_name || 'WALK-IN';
    const cashier = inv.cashier_name || inv.created_by_name || 'CASHIER';

    const saleDate = new Date(inv.sale_date || Date.now());
    const dateStr = saleDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = saleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

    const wPt = RECEIPT_WIDTH_MM * MM_TO_PT;
    const side = 8;
    const innerW = wPt - side * 2;
    const cx = side + innerW / 2;

    // Column layout: Description | Rate | Qty | Amount | Srv Chg
    const cDesc = innerW * 0.40;
    const cRate = innerW * 0.16;
    const cQty = innerW * 0.11;
    const cAmount = innerW * 0.19;
    const cSrv = innerW - cDesc - cRate - cQty - cAmount;
    const xDesc = side;
    const xRate = xDesc + cDesc;
    const xQty = xRate + cRate;
    const xAmount = xQty + cQty;
    const xSrv = xAmount + cAmount;

    const estH = 440 + items.length * 26;
    const pageH = Math.min(72 * 80, Math.max(72 * 18, estH));
    const doc = new PDFDocument({ size: [wPt, pageH], margin: 0, bufferPages: true });
    const ws = fs.createWriteStream(filepath);
    doc.pipe(ws);

    let y = side;
    const bottom = () => doc.page.height - side;

    const hr = (yy, lw = 0.6) => {
      doc.moveTo(side, yy).lineTo(side + innerW, yy).lineWidth(lw).strokeColor('#111111').stroke();
      return yy + 4;
    };

    const ensureSpace = (h) => {
      if (y + h <= bottom()) return;
      doc.addPage({ size: [wPt, pageH], margin: 0 });
      y = side;
    };

    // Header (monochrome centered)
    if (B.logoPath) {
      ensureSpace(42);
      y = drawLogoCircular(doc, B.logoPath, cx, y, 34);
      y += 2;
    }

    ensureSpace(64);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111111').text(B.name || 'STORE NAME', side, y, {
      width: innerW,
      align: 'center',
    });
    y = doc.y + 2;
    if (B.phone) {
      doc.font('Helvetica-Bold').fontSize(10).text(`Mob: ${B.phone}`, side, y, { width: innerW, align: 'center' });
      y = doc.y + 1;
    }
    if (B.address) {
      doc.font('Helvetica').fontSize(8).text(B.address, side, y, { width: innerW, align: 'center' });
      y = doc.y + 3;
    }

    y += 2;
    doc.font('Helvetica').fontSize(8);
    doc.text(dateStr, side, y, { width: innerW * 0.33, align: 'left' });
    doc.text(timeStr, side + innerW * 0.33, y, { width: innerW * 0.24, align: 'center' });
    doc.text(`Cashier: ${cashier}`, side + innerW * 0.57, y, { width: innerW * 0.43, align: 'right' });
    y += 11;
    doc.text(`Customer: ${customer}`, side, y, { width: innerW * 0.72, align: 'left' });
    doc.text(`No: ${inv.invoice_no || '001'}`, side + innerW * 0.72, y, { width: innerW * 0.28, align: 'right' });
    y += 10;
    y += 4;

    doc.font('Helvetica-Bold').fontSize(11).text('DUPLICATE', side, y, { width: innerW, align: 'center' });
    y = doc.y + 4;

    // Table header
    y = hr(y, 0.8);
    doc.font('Helvetica-Bold').fontSize(7);
    doc.text('Description', xDesc + 1, y, { width: cDesc - 2, align: 'left' });
    doc.text('Rate', xRate, y, { width: cRate - 2, align: 'right' });
    doc.text('Qty', xQty, y, { width: cQty - 2, align: 'right' });
    doc.text('Amount', xAmount, y, { width: cAmount - 2, align: 'right' });
    doc.text('Srv', xSrv, y, { width: cSrv - 2, align: 'right' });
    y += 10;
    y = hr(y, 0.8);

    // Rows
    doc.font('Helvetica').fontSize(7.2);
    items.forEach((it) => {
      const name = String(it.product_name || 'Item').slice(0, 30);
      const qty = parseAmount(it.quantity);
      const rate = parseAmount(it.unit_price);
      const amount = parseAmount(it.line_total || qty * rate);
      const srv = parseAmount(it.tax || 0);
      ensureSpace(14);
      doc.text(name, xDesc + 1, y, { width: cDesc - 2, align: 'left', lineBreak: false });
      doc.text(String(rate.toFixed(1)), xRate, y, { width: cRate - 2, align: 'right', lineBreak: false });
      doc.text(String(qty.toFixed(1)), xQty, y, { width: cQty - 2, align: 'right', lineBreak: false });
      doc.text(String(amount.toFixed(1)), xAmount, y, { width: cAmount - 2, align: 'right', lineBreak: false });
      doc.text(String(srv.toFixed(1)), xSrv, y, { width: cSrv - 2, align: 'right', lineBreak: false });
      y += 10;
    });

    if (!items.length) {
      ensureSpace(16);
      doc.fontSize(8).text('No items', side, y, { width: innerW, align: 'center' });
      y += 10;
    }

    // Totals block
    y += 2;
    y = hr(y, 0.8);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Items: ${items.length}`, side, y, { width: innerW * 0.5, align: 'left' });
    doc.text(`Sub Total: ${subtotal.toFixed(2)}`, side + innerW * 0.5, y, { width: innerW * 0.5, align: 'right' });
    y += 12;

    doc.text('Grand Total', side, y, { width: innerW * 0.5, align: 'left' });
    doc.font('Helvetica-Bold').text(net.toFixed(2), side + innerW * 0.5, y, { width: innerW * 0.5, align: 'right' });
    y += 11;

    doc.font('Helvetica').text(`Payment  ${paymentMode}`, side, y, { width: innerW * 0.5, align: 'left' });
    doc.text(paid.toFixed(2), side + innerW * 0.5, y, { width: innerW * 0.5, align: 'right' });
    y += 10;

    doc.text('Change', side, y, { width: innerW * 0.5, align: 'left' });
    doc.text(change.toFixed(2), side + innerW * 0.5, y, { width: innerW * 0.5, align: 'right' });
    y += 11;

    if (discount > 0 || tax > 0) {
      doc.fontSize(7.5).fillColor('#333333');
      doc.text(`Discount: ${discount.toFixed(2)}   GST: ${tax.toFixed(2)}`, side, y, { width: innerW, align: 'left' });
      y += 10;
    }

    y += 2;
    doc.font('Helvetica-Bold').fontSize(9).text(`RUPEES ${Math.round(net)} ONLY`, side, y, { width: innerW, align: 'center' });
    y = doc.y + 6;
    doc.font('Helvetica').fontSize(8).text(B.footerText || 'THANK YOU FOR YOUR KIND VISIT', side, y, {
      width: innerW,
      align: 'center',
    });

    doc.end();
    ws.on('finish', () => resolve(filepath));
    ws.on('error', reject);
  });
}

module.exports = { generate };
