const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    invoiceDesign: {
      template: {
        type: String,
        default: 'modern_sale_a4',
      },
      /** PDF layout for sales invoices / receipts */
      saleTemplate: { type: String, default: 'modern_sale_a4' },
      /** PDF layout for purchase orders */
      purchaseOrderTemplate: { type: String, default: 'modern_po_a4' },
      companyName: { type: String, default: 'Admin Company' },
      /** App chrome name (sidebar / header / browser title) */
      appName: { type: String, default: 'POSHub' },
      tagline: { type: String, default: 'PHARMACY SUITE' },
      address: { type: String, default: '795 Folsom Ave, Suite 600, San Francisco, CA 94107, USA' },
      phone: { type: String, default: '+1 234 567 890' },
      email: { type: String, default: 'admin@example.com' },
      gstin: { type: String, default: '' },
      regNumber: { type: String, default: '' },
      footerText: { type: String, default: 'Thank you for your business!' },
      receiptPoweredBy: { type: String, default: '' },
      receiptWebsite: { type: String, default: '' },
      logoUrl: { type: String },
      sidebarLogoUrl: { type: String },
      /** Custom app logo for sidebar/header (falls back to main-app-logo.png) */
      appLogoUrl: { type: String },
      /** Preferred Windows printer name for receipts / invoices */
      connectedPrinter: { type: String, default: '' },
      primaryColor: { type: String, default: '#306844' },
      secondaryColor: { type: String, default: '#182c25' },
      buttonColor: { type: String, default: '#306844' },
      sidebarColor: { type: String, default: '#182c25' },
      posLayout: { type: String, default: 'tabular' },
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
