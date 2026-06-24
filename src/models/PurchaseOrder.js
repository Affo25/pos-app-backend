const mongoose = require('mongoose');

const PurchaseOrderItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const PurchaseReturnItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    return_date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplier_name: {
      type: String,
      trim: true,
      default: '',
    },
    order_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    order_date: {
      type: Date,
      required: true,
    },
    items: {
      type: [PurchaseOrderItemSchema],
      default: [],
    },
    returns: {
      type: [PurchaseReturnItemSchema],
      default: [],
    },
    amount_paid: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'received', 'cancelled'],
      default: 'pending',
    },
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
