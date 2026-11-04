const { buildBranding } = require('./branding');
const a4Strip = require('./templates/a4_80mm_strip');
const reportA4 = require('./templates/report_a4');
const purchaseOrderA4 = require('./templates/purchase_order_a4');
const restaurant80 = require('./templates/restaurant_80mm');
const posReceipt = require('./templates/pos_receipt');
const modernSaleA4 = require('./templates/modern_sale_a4');
const modernPoA4 = require('./templates/modern_po_a4');

const TEMPLATE_GENERATORS = {
  modern_sale_a4: modernSaleA4,
  modern_po_a4: modernPoA4,
  purchase_order_a4: purchaseOrderA4,
  report_a4: reportA4,
  restaurant_80mm: restaurant80,
  pos_receipt: posReceipt,
  a4_80mm_strip: a4Strip,
};

function isPurchaseOrder(inv) {
  const docType = String(inv?.document_type || '').toLowerCase();
  const docTitle = String(inv?.document_title || '').toUpperCase();
  return docType === 'purchase_order' || docTitle.includes('PURCHASE ORDER');
}

function resolveTemplateKey(inv, branding) {
  const B = branding || {};
  if (B.template && TEMPLATE_GENERATORS[B.template]) {
    // Explicit override (print/preview API) wins.
    if (B.templateForced) return B.template;
  }
  if (isPurchaseOrder(inv)) {
    return (
      B.purchaseOrderTemplate ||
      (B.template && String(B.template).includes('purchase') ? B.template : null) ||
      'modern_po_a4'
    );
  }
  return B.saleTemplate || B.template || 'modern_sale_a4';
}

/**
 * @param {object} inv invoice payload
 * @param {object|null} branding from buildBranding / loadBrandingForRequest
 * @returns {Promise<string>} path to temp PDF file
 */
function generateInvoicePDF(inv, branding) {
  const B = branding || buildBranding(null);
  const key = resolveTemplateKey(inv, B);
  const generator = TEMPLATE_GENERATORS[key] || (isPurchaseOrder(inv) ? modernPoA4 : modernSaleA4);
  return generator.generate(inv, B);
}

module.exports = {
  generateInvoicePDF,
  resolveTemplateKey,
  TEMPLATE_GENERATORS,
};
