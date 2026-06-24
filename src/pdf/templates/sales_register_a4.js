const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { TMP_DIR } = require('../paths');
const { money } = require('../shared');

const PW = 595.28;
const PH = 841.89;
const ORANGE_TOP = '#f6a23c';
const WHITE = '#ffffff';
const GREEN = '#2d6a4f';
const DARK = '#1f2937';
const GREY = '#6b7280';
const LINE = '#e5e7eb';

const MARGIN = 40;
const ROW_H = 13;
const FOOTER_H = 72;
const TABLE_HEADER_H = 22;

/**
 * Multi-page A4 sales register (filtered list).
 * @param {object} payload
 * @param {Array<{invoice_no:string,customer_name:string,date_label:string,total_amount:number,net_amount:number,status:string}>} payload.records
 * @param {string} [payload.subtitle]
 * @param {string} [payload.generated_at]
 * @param {object} B branding
 */
function generate(payload, B) {
  return new Promise((resolve, reject) => {
    const records = Array.isArray(payload.records) ? payload.records : [];
    const subtitle = payload.subtitle || '';
    const generatedAt = payload.generated_at || new Date().toLocaleString('en-GB');

    const filename = `sales-register-${Date.now()}.pdf`;
    const filepath = path.join(TMP_DIR, filename);

    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    const ws = fs.createWriteStream(filepath);
    doc.pipe(ws);

    const title = 'SALES REGISTER';
    let pageNum = 0;

    const sumNet = records.reduce((s, r) => s + Number(r.net_amount || 0), 0);
    const sumTotal = records.reduce((s, r) => s + Number(r.total_amount || 0), 0);

    function drawTopBand(isFirstPage) {
      doc.rect(0, 0, PW, isFirstPage ? 72 : 52).fill(ORANGE_TOP);
      doc.fillColor(WHITE);
      doc.fontSize(isFirstPage ? 18 : 14).font('Helvetica-Bold').text(title, 0, isFirstPage ? 16 : 12, { align: 'center', width: PW });
      if (subtitle && isFirstPage) {
        doc.fontSize(8).font('Helvetica').text(subtitle, MARGIN, 40, { width: PW - MARGIN * 2, align: 'center' });
      }
      doc.fontSize(7).font('Helvetica').text(`Generated: ${generatedAt} · Page ${pageNum}`, MARGIN, isFirstPage ? 56 : 34, {
        width: PW - MARGIN * 2,
        align: 'center',
      });
      doc.fillColor(DARK);
      return isFirstPage ? 82 : 58;
    }

    function drawTableHeader(y) {
      doc.rect(MARGIN, y, PW - MARGIN * 2, TABLE_HEADER_H).fill(GREEN);
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold');
      const x0 = MARGIN + 6;
      doc.text('#', x0, y + 7, { width: 18, align: 'right' });
      doc.text('Invoice', x0 + 22, y + 7, { width: 68 });
      doc.text('Customer', x0 + 94, y + 7, { width: 148 });
      doc.text('Date / time', x0 + 246, y + 7, { width: 88 });
      doc.text('Total', x0 + 338, y + 7, { width: 58, align: 'right' });
      doc.text('Net', x0 + 402, y + 7, { width: 58, align: 'right' });
      doc.text('Status', x0 + 466, y + 7, { width: PW - MARGIN * 2 - 472 });
      doc.fillColor(DARK).font('Helvetica');
      return y + TABLE_HEADER_H + 4;
    }

    function newPage(isFirst) {
      if (!isFirst) doc.addPage();
      pageNum += 1;
      let y = drawTopBand(isFirst);
      y = drawTableHeader(y);
      return y;
    }

    let y = newPage(true);
    const bottomLimit = PH - FOOTER_H;

    records.forEach((rec, idx) => {
      if (y + ROW_H > bottomLimit) {
        y = newPage(false);
      }

      const rowBg = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(MARGIN, y - 2, PW - MARGIN * 2, ROW_H).fill(rowBg);
      doc.fillColor(DARK).fontSize(7.5);

      const x0 = MARGIN + 6;
      const inv = String(rec.invoice_no || '—').slice(0, 18);
      const cust = String(rec.customer_name || '—').slice(0, 42);
      const dt = String(rec.date_label || '—').slice(0, 22);
      const st = String(rec.status || '—').replace(/_/g, ' ').slice(0, 14);

      doc.text(String(idx + 1), x0, y + 1, { width: 18, align: 'right' });
      doc.text(inv, x0 + 22, y + 1, { width: 68 });
      doc.fillColor(DARK).text(cust, x0 + 94, y + 1, { width: 148, ellipsis: true });
      doc.fillColor(GREY).text(dt, x0 + 246, y + 1, { width: 88, ellipsis: true });
      doc.fillColor(DARK).text(money(rec.total_amount), x0 + 338, y + 1, { width: 58, align: 'right' });
      doc.text(money(rec.net_amount), x0 + 402, y + 1, { width: 58, align: 'right' });
      doc.fontSize(6.5).fillColor(DARK).text(st, x0 + 466, y + 1, { width: PW - MARGIN * 2 - 472, ellipsis: true });

      y += ROW_H;
      doc.strokeColor(LINE).moveTo(MARGIN, y - 1).lineTo(PW - MARGIN, y - 1).lineWidth(0.2).stroke();
    });

    if (y + 48 > bottomLimit) {
      y = newPage(false);
    }

    y += 8;
    doc.roundedRect(MARGIN, y, PW - MARGIN * 2, 44, 6).stroke(GREEN).lineWidth(0.8);
    doc.fillColor(GREEN).fontSize(10).font('Helvetica-Bold').text('Summary', MARGIN + 10, y + 8);
    doc.fillColor(DARK).fontSize(9).font('Helvetica');
    doc.text(`Rows: ${records.length}`, MARGIN + 10, y + 24);
    doc.text(`Sum (net): ${money(sumNet)}`, MARGIN + 120, y + 24);
    doc.text(`Sum (gross / lines): ${money(sumTotal)}`, MARGIN + 280, y + 24);

    doc.fontSize(8).fillColor(GREY).font('Helvetica').text(B.name || '', MARGIN, PH - 36, { width: PW - MARGIN * 2 });

    doc.end();
    ws.on('finish', () => resolve(filepath));
    ws.on('error', reject);
  });
}

module.exports = { generate };
