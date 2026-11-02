const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    invoiceDesign: {
      template: {
        type: String,
        default: 'a4_80mm_strip',
      },
      companyName: { type: String, default: 'Admin Company' },
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
      primaryColor: { type: String, default: '#c4f45d' },
      secondaryColor: { type: String, default: '#0d2b26' },
      buttonColor: { type: String, default: '#c4f45d' },
      sidebarColor: { type: String, default: '#0d2b26' },
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
