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

const ALLOWED_PDF_TEMPLATES = [
  'modern_sale_a4',
  'modern_po_a4',
  'report_a4',
  'purchase_order_a4',
  'restaurant_80mm',
  'a4_80mm_strip',
  'pos_receipt',
];

const INVOICE_KEYS = [
  'template',
  'saleTemplate',
  'purchaseOrderTemplate',
  'companyName',
  'appName',
  'tagline',
  'address',
  'phone',
  'email',
  'footerText',
  'receiptPoweredBy',
  'receiptWebsite',
  'logoUrl',
  'sidebarLogoUrl',
  'appLogoUrl',
  'connectedPrinter',
  'primaryColor',
  'secondaryColor',
  'buttonColor',
  'sidebarColor',
  'gstin',
  'regNumber',
  'posLayout',
];

function isHexColor(v) {
  return typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

exports.updateSettings = async (req, res) => {
  try {
    const ownerId = getTenantOwnerId(req.user);
    if (!ownerId) return res.status(400).json({ error: 'Could not resolve tenant' });
    const doc = await getOrCreateSettings(ownerId);
    const { invoiceDesign } = req.body || {};
    if (invoiceDesign && typeof invoiceDesign === 'object') {
      for (const k of INVOICE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(invoiceDesign, k)) {
          let v = invoiceDesign[k];
          if (
            ['template', 'saleTemplate', 'purchaseOrderTemplate'].includes(k) &&
            typeof v === 'string' &&
            !ALLOWED_PDF_TEMPLATES.includes(v)
          ) {
            v =
              k === 'purchaseOrderTemplate'
                ? 'modern_po_a4'
                : 'modern_sale_a4';
          }
          if (k === 'posLayout' && typeof v === 'string') {
            const vn = v.trim().toLowerCase();
            v = vn === 'gridview' || vn === 'grid' ? 'gridview' : 'tabular';
          }
          if (['primaryColor', 'secondaryColor', 'buttonColor', 'sidebarColor'].includes(k) && v) {
            if (!isHexColor(v)) continue;
            v = v.trim();
          }
          doc.invoiceDesign[k] = v;
        }
      }
      // Keep button/sidebar colors in sync with primary/secondary when only one side is set
      if (invoiceDesign.buttonColor && isHexColor(invoiceDesign.buttonColor)) {
        doc.invoiceDesign.primaryColor = invoiceDesign.buttonColor.trim();
      } else if (invoiceDesign.primaryColor && isHexColor(invoiceDesign.primaryColor)) {
        doc.invoiceDesign.buttonColor = invoiceDesign.primaryColor.trim();
      }
      if (invoiceDesign.sidebarColor && isHexColor(invoiceDesign.sidebarColor)) {
        doc.invoiceDesign.secondaryColor = invoiceDesign.sidebarColor.trim();
      } else if (invoiceDesign.secondaryColor && isHexColor(invoiceDesign.secondaryColor)) {
        doc.invoiceDesign.sidebarColor = invoiceDesign.secondaryColor.trim();
      }
      // Keep legacy `template` aligned with sale PDF choice for older clients
      if (doc.invoiceDesign.saleTemplate) {
        doc.invoiceDesign.template = doc.invoiceDesign.saleTemplate;
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

/**
 * POST /api/settings/sidebar-logo — multipart field "file"
 */
exports.uploadSidebarLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ownerId = getTenantOwnerId(req.user);
    if (!ownerId) return res.status(400).json({ error: 'Could not resolve tenant' });

    const publicPath = `/uploads/sidebar-logos/${req.file.filename}`;
    const doc = await getOrCreateSettings(ownerId);

    if (doc.invoiceDesign.sidebarLogoUrl && doc.invoiceDesign.sidebarLogoUrl.startsWith('/uploads/sidebar-logos/')) {
      const oldName = path.basename(doc.invoiceDesign.sidebarLogoUrl);
      const oldAbs = path.join(path.dirname(req.file.path), oldName);
      if (oldAbs !== req.file.path) {
        try {
          if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
        } catch {
          /* ignore */
        }
      }
    }

    doc.invoiceDesign.sidebarLogoUrl = publicPath;
    await doc.save();
    return res.json({ settings: doc, sidebarLogoUrl: publicPath });
  } catch (err) {
    console.error('uploadSidebarLogo', err);
    return res.status(500).json({ error: 'Sidebar logo upload failed', detail: err.message });
  }
};

/**
 * POST /api/settings/app-logo — multipart field "file"
 * Stores under sidebar-logos and sets appLogoUrl (+ sidebarLogoUrl for chrome).
 */
exports.uploadAppLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ownerId = getTenantOwnerId(req.user);
    if (!ownerId) return res.status(400).json({ error: 'Could not resolve tenant' });

    const publicPath = `/uploads/sidebar-logos/${req.file.filename}`;
    const doc = await getOrCreateSettings(ownerId);

    if (doc.invoiceDesign.appLogoUrl && doc.invoiceDesign.appLogoUrl.startsWith('/uploads/sidebar-logos/')) {
      const oldName = path.basename(doc.invoiceDesign.appLogoUrl);
      const oldAbs = path.join(path.dirname(req.file.path), oldName);
      if (oldAbs !== req.file.path) {
        try {
          if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
        } catch {
          /* ignore */
        }
      }
    }

    doc.invoiceDesign.appLogoUrl = publicPath;
    doc.invoiceDesign.sidebarLogoUrl = publicPath;
    await doc.save();
    return res.json({ settings: doc, appLogoUrl: publicPath, sidebarLogoUrl: publicPath });
  } catch (err) {
    console.error('uploadAppLogo', err);
    return res.status(500).json({ error: 'App logo upload failed', detail: err.message });
  }
};

exports.getTenantOwnerId = getTenantOwnerId;
exports.getOrCreateSettings = getOrCreateSettings;
