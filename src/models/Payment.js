const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    payment_no: {
      type: String,
      required: true,
      trim: true,
    },

    payment_type: {
      type: String,
      enum: ['sale', 'purchase'],
      required: true,
      index: true,
    },

    reference_type: {
      type: String,
      enum: ['sale_order', 'purchase_order'],
      required: true,
    },

    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'reference_model',
    },

    reference_model: {
      type: String,
      enum: ['Sale', 'PurchaseOrder'],
      required: true,
    },

    /** Sale invoice_no or purchase order_number */
    reference_no: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },

    party_type: {
      type: String,
      enum: ['customer', 'supplier'],
      required: true,
    },

    party_name: {
      type: String,
      trim: true,
      default: '',
    },

    payment_method: {
      type: String,
      enum: [
        'cash',
        'bank_transfer',
        'credit_card',
        'debit_card',
        'cheque',
        'online',
        'wallet',
      ],
      required: true,
    },

    transaction_type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paid_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remaining_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    payment_date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    due_date: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },

    transaction_id: {
      type: String,
      trim: true,
      default: '',
    },

    bank_name: {
      type: String,
      trim: true,
      default: '',
    },

    cheque_no: {
      type: String,
      trim: true,
      default: '',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    attachment: {
      type: String,
      default: '',
    },

    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BranchProfile',
      default: null,
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

PaymentSchema.index({ admin_id: 1, payment_no: 1 }, { unique: true });
PaymentSchema.index({ reference_id: 1, reference_model: 1 });
PaymentSchema.index({ payment_date: -1 });
PaymentSchema.index({ status: 1 });

PaymentSchema.pre('save', async function fillReferenceNo(next) {
  try {
    if (this.reference_no && String(this.reference_no).trim()) {
      return next();
    }
    if (!this.reference_id || !this.reference_model) {
      return next();
    }

    if (this.reference_model === 'Sale') {
      const Sale = mongoose.model('Sale');
      const sale = await Sale.findById(this.reference_id).select('invoice_no').lean();
      if (sale?.invoice_no) {
        this.reference_no = String(sale.invoice_no).trim();
      }
    } else if (this.reference_model === 'PurchaseOrder') {
      const PurchaseOrder = mongoose.model('PurchaseOrder');
      const po = await PurchaseOrder.findById(this.reference_id).select('order_number').lean();
      if (po?.order_number) {
        this.reference_no = String(po.order_number).trim();
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Payment', PaymentSchema);
