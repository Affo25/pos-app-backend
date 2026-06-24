const { buildBranding } = require('./branding');
const a4Strip = require('./templates/a4_80mm_strip');
const reportA4 = require('./templates/report_a4');
const purchaseOrderA4 = require('./templates/purchase_order_a4');
const restaurant80 = require('./templates/restaurant_80mm');
const posReceipt = require('./templates/pos_receipt');

/**
 * @param {object} inv invoice payload
 * @param {object|null} branding from buildBranding / loadBrandingForRequest
 * @returns {Promise<string>} path to temp PDF file
 */
function generateInvoicePDF(inv, branding) {
  const B = branding || buildBranding(null);
  const docType = String(inv.document_type || '').toLowerCase();
  const docTitle = String(inv.document_title || '').toUpperCase();

  switch (B.template) {
    case 'purchase_order_a4':
      return purchaseOrderA4.generate(inv, B);
    case 'report_a4':
      return reportA4.generate(inv, B);
    case 'restaurant_80mm':
      return restaurant80.generate(inv, B);
    case 'pos_receipt':
      return posReceipt.generate(inv, B);
    case 'a4_80mm_strip':
      return a4Strip.generate(inv, B);
    default:
      if (docType === 'purchase_order' || docTitle.includes('PURCHASE ORDER')) {
        return purchaseOrderA4.generate(inv, B);
      }
      return a4Strip.generate(inv, B);
  }
}

module.exports = { generateInvoicePDF };
