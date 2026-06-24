const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  loyalty_points: {
    type: Number,
    default: 0,
  },
  /** Starting receivable balance from this customer (PKR) */
  opening_balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  opening_balance_note: {
    type: String,
    trim: true,
    default: '',
  },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
