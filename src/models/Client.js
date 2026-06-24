const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  email: { type: String, required: true, unique: true, },
  contact: { type: String, required: true },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  package_name: { type: String },
  company_name: { type: String },
  address: { type: String },
  country: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);
