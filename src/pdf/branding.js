const fs = require('fs');
const path = require('path');
const { getTenantOwnerId, getOrCreateSettings } = require('../controllers/settingsController');

const ENV_STORE = {
  name: process.env.INVOICE_STORE_NAME || 'Aid+ Pharmacy',
  tagline: process.env.INVOICE_TAGLINE || 'PHARMACY SUITE',
  address: process.env.INVOICE_ADDRESS || '',
  phone: process.env.INVOICE_PHONE || '',
  email: process.env.INVOICE_EMAIL || '',
  gstin: process.env.INVOICE_GST || process.env.INVOICE_GSTIN || '',
};

const { C } = require('./shared');

function resolveLogoPath(logoUrl) {
  if (!logoUrl || typeof logoUrl !== 'string') return null;
  if (/^https?:\/\//i.test(logoUrl)) return null;
  const rel = logoUrl.replace(/^\//, '');
  const abs = path.join(__dirname, '..', '..', rel.split(/[/\\]/).join(path.sep));
  return fs.existsSync(abs) ? abs : null;
}

function buildBranding(invoiceDesign) {
  const d = invoiceDesign || {};
  const accent = d.primaryColor || C.accent;
  const forest = d.secondaryColor || C.forest;
  const validTemplates = ['report_a4', 'purchase_order_a4', 'restaurant_80mm', 'a4_80mm_strip', 'pos_receipt'];
  const template = validTemplates.includes(d.template) ? d.template : 'a4_80mm_strip';
  return {
    template,
    name: d.companyName || ENV_STORE.name,
    tagline: d.tagline || ENV_STORE.tagline,
    address: d.address || ENV_STORE.address,
    phone: d.phone || ENV_STORE.phone,
    email: d.email || ENV_STORE.email,
    gstin: d.gstin || ENV_STORE.gstin,
    regNumber: d.regNumber || '',
    footerText: d.footerText || 'Thank you for your business!',
    /** 80mm strip footer (optional; defaults in restaurant_80mm template). */
    receiptPoweredBy: d.receiptPoweredBy || process.env.INVOICE_RECEIPT_POWERED_BY || '',
    receiptWebsite: d.receiptWebsite || process.env.INVOICE_RECEIPT_WEBSITE || '',
    logoPath: resolveLogoPath(d.logoUrl),
    accent,
    forest,
  };
}

async function loadBrandingForRequest(req) {
  try {
    const ownerId = getTenantOwnerId(req.user);
    if (!ownerId) return buildBranding(null);
    const doc = await getOrCreateSettings(ownerId);
    return buildBranding(doc.invoiceDesign);
  } catch (e) {
    console.error('loadBrandingForRequest', e);
    return buildBranding(null);
  }
}

module.exports = {
  buildBranding,
  loadBrandingForRequest,
  resolveLogoPath,
};
