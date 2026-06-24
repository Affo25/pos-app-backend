const mongoose = require('mongoose');

const ReturnSchema = new mongoose.Schema({
  sale_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
  },
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
  unit_price: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Price at which product was sold (for return amount calculation)'
  },
  reason: {
    type: String,
    trim: true,
  },
  return_date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
    comment: 'Return request status'
  },
  refund_amount: {
    type: Number,
    default: 0,
    comment: 'Total refund amount for this return item'
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Pre-save middleware to calculate refund amount
ReturnSchema.pre('save', function(next) {
  if (this.quantity && this.unit_price) {
    this.refund_amount = this.quantity * this.unit_price;
  }
  next();
});

// Add index for better query performance
ReturnSchema.index({ sale_id: 1, product_id: 1 });
ReturnSchema.index({ return_date: -1 });
ReturnSchema.index({ status: 1 });

module.exports = mongoose.model('Return', ReturnSchema);