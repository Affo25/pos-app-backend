const path = require('path');
const fs = require('fs');
const Settings = require('../models/Settings');

function getTenantOwnerId(user) {
  if (!user) return null;
  if (user.user_type === 'admin' || user.user_type === 'superAdmin') return user._id;
  if (user.admin_id) return user.admin_id;
  return user._id;
}

async function getOrCreateSettings(ownerId) {
  let doc = await Settings.findOne({ user_id: ownerId });
  if (!doc) {
    doc = await Settings.create({ user_id: ownerId });
  }
  return doc;
}

exports.getSettings = async (req, res) => {
  try {
    const ownerId = getTenantOwnerId(req.user);
    if (!ownerId) return res.status(400).json({ error: 'Could not resolve tenant' });
    const doc = await getOrCreateSettings(ownerId);
    return res.json({ settings: doc });
  } catch (err) {
    console.error('getSettings', err);
    return res.status(500).json({ error: 'Failed to load settings', detail: err.message });
  }
};

const INVOICE_KEYS = [
  'template',
  'companyName',
  'tagline',
  'address',
  'phone',
  'email',
  'footerText',
  'receiptPoweredBy',
  'receiptWebsite',
  'logoUrl',
  'primaryColor',
  'secondaryColor',
  'gstin',
  'regNumber',
  'posLayout',
];

exports.updateSettings = async (req, res) => {
  try {
    const ownerId = getTenantOwnerId(req.user);
    if (!ownerId) return res.status(400).json({ error: 'Could not resolve tenant' });
    const doc = await getOrCreateSettings(ownerId);
    const { invoiceDesign } = req.body || {};
    if (invoiceDesign && typeof invoiceDesign === 'object') {
      const allowedTemplates = ['report_a4', 'restaurant_80mm', 'a4_80mm_strip', 'pos_receipt'];
      for (const k of INVOICE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(invoiceDesign, k)) {
          let v = invoiceDesign[k];
          if (k === 'template' && typeof v === 'string' && !allowedTemplates.includes(v)) {
            v = 'a4_80mm_strip';
          }
          if (k === 'posLayout' && typeof v === 'string') {
            const vn = v.trim().toLowerCase();
            v = vn === 'gridview' || vn === 'grid' ? 'gridview' : 'tabular';
          }
          doc.invoiceDesign[k] = v;
        }
      }
    }
    await doc.save();
    return res.json({ settings: doc });
  } catch (err) {
    console.error('updateSettings', err);
    return res.status(500).json({ error: 'Failed to save settings', detail: err.message });
  }
};

/**
 * POST /api/settings/invoice-logo — multipart field "file"
 */
exports.uploadInvoiceLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ownerId = getTenantOwnerId(req.user);
    if (!ownerId) return res.status(400).json({ error: 'Could not resolve tenant' });

    const publicPath = `/uploads/invoice-logos/${req.file.filename}`;
    const doc = await getOrCreateSettings(ownerId);

    if (doc.invoiceDesign.logoUrl && doc.invoiceDesign.logoUrl.startsWith('/uploads/invoice-logos/')) {
      const oldName = path.basename(doc.invoiceDesign.logoUrl);
      const oldAbs = path.join(path.dirname(req.file.path), oldName);
      if (oldAbs !== req.file.path) {
        try {
          if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
        } catch {
          /* ignore */
        }
      }
    }

    doc.invoiceDesign.logoUrl = publicPath;
    await doc.save();
    return res.json({ settings: doc, logoUrl: publicPath });
  } catch (err) {
    console.error('uploadInvoiceLogo', err);
    return res.status(500).json({ error: 'Logo upload failed', detail: err.message });
  }
};

exports.getTenantOwnerId = getTenantOwnerId;
exports.getOrCreateSettings = getOrCreateSettings;
