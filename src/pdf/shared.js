const MM_TO_PT = 72 / 25.4;
const RECEIPT_WIDTH_MM = 80;

const C = {
  accent: '#2563eb',
  forest: '#1a3a34',
  dark: '#111827',
  mid: '#374151',
  muted: '#6b7280',
  lightMuted: '#94a3b8',
  line: '#e2e8f0',
  white: '#ffffff',
  rowAlt: '#f8fafc',
};

/** Narrow columns: keep symbol + amount on one line (PDFKit wraps on normal spaces). */
const MONEY_NBSP = '\u00a0';

/**
 * Parse a numeric amount that may arrive as a number or a string with currency noise.
 */
function parseAmount(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  let s = String(val).trim().replace(/,/g, '');
  while (/^(pkr|rs\.?|₨|rupees?)\s*/i.test(s)) {
    s = s.replace(/^(pkr|rs\.?|₨|rupees?)\s*/i, '').trim();
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function money(n) {
  const sym = (process.env.INVOICE_CURRENCY_SYMBOL || 'Rs').trim();
  const num = parseAmount(n);
  return `${sym}${MONEY_NBSP}${num.toFixed(2)}`;
}

function solidRule(doc, x1, x2, y, color = C.line, lw = 0.75) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(lw).strokeColor(color).stroke();
  return y + 8;
}

function dashedRule(doc, x1, x2, y) {
  doc.save();
  doc.moveTo(x1, y).lineTo(x2, y).dash(3, { space: 2 }).lineWidth(0.5).strokeColor(C.muted).stroke();
  doc.restore();
  return y + 6;
}

/** Horizontal dotted rule (thermal receipt style). */
function dottedRule(doc, x1, x2, y, color = '#111827', lw = 0.45) {
  doc.save();
  doc.moveTo(x1, y).lineTo(x2, y).dash(1, { space: 2 }).lineWidth(lw).strokeColor(color).stroke();
  doc.restore();
  return y + 5;
}

/** Prominent dashed separator (footer band). */
function thickDashedRule(doc, x1, x2, y, color = '#111827') {
  doc.save();
  doc.moveTo(x1, y).lineTo(x2, y).dash(5, { space: 3 }).lineWidth(1.1).strokeColor(color).stroke();
  doc.restore();
  return y + 8;
}

function vDottedLine(doc, x, y1, y2, color = '#111827') {
  doc.save();
  doc.moveTo(x, y1).lineTo(x, y2).dash(1, { space: 2 }).lineWidth(0.35).strokeColor(color).stroke();
  doc.restore();
}

/** Black solid horizontal rule; returns y below rule. */
function solidRuleBlack(doc, x1, x2, y, lw = 0.6) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(lw).strokeColor('#111827').stroke();
  return y + 6;
}

function drawLogo(doc, logoPath, x, y, maxW, maxH) {
  if (!logoPath) return y;
  try {
    doc.image(logoPath, x, y, { fit: [maxW, maxH], align: 'center' });
    return y + maxH + 6;
  } catch (e) {
    console.warn('drawLogo failed', e.message);
    return y;
  }
}

/** Circular clipped logo with thin ring (80mm receipt header). */
function drawLogoCircular(doc, logoPath, cx, yTop, diameterPt) {
  if (!logoPath) return yTop;
  const r = diameterPt / 2;
  const cy = yTop + r;
  const left = cx - r;
  try {
    doc.save();
    doc.circle(cx, cy, r).clip();
    doc.image(logoPath, left, yTop, { width: diameterPt, height: diameterPt });
    doc.restore();
    doc.circle(cx, cy, r).lineWidth(0.4).strokeColor('#374151').stroke();
    return yTop + diameterPt + 5;
  } catch (e) {
    try {
      doc.restore();
    } catch {
      /* ignore */
    }
    console.warn('drawLogoCircular failed', e.message);
    return yTop;
  }
}

module.exports = {
  C,
  MM_TO_PT,
  RECEIPT_WIDTH_MM,
  money,
  parseAmount,
  solidRule,
  dashedRule,
  dottedRule,
  thickDashedRule,
  vDottedLine,
  solidRuleBlack,
  drawLogo,
  drawLogoCircular,
};
