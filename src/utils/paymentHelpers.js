const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const PurchaseOrder = require('../models/PurchaseOrder');
const { netOrderTotal } = require('./purchaseOrderHelpers');
const { generateSaleInvoiceNo } = require('./saleHelpers');

const PAYMENT_METHOD_ALIASES = {
  card: 'credit_card',
  credit: 'credit_card',
  debit: 'debit_card',
  bank: 'bank_transfer',
  transfer: 'bank_transfer',
};

function normalizePaymentMethod(method) {
  const raw = String(method || 'cash').toLowerCase().trim();
  if (PAYMENT_METHOD_ALIASES[raw]) return PAYMENT_METHOD_ALIASES[raw];
  const allowed = [
    'cash',
    'bank_transfer',
    'credit_card',
    'debit_card',
    'cheque',
    'online',
    'wallet',
  ];
  return allowed.includes(raw) ? raw : 'cash';
}

function generatePaymentNo() {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `PAY-${ts}-${rand}`;
}

function derivePaymentStatus(orderTotal, totalPaid) {
  const total = Math.max(0, Number(orderTotal || 0));
  const paid = Math.max(0, Number(totalPaid || 0));
  if (total <= 0) return paid > 0 ? 'paid' : 'pending';
  if (paid <= 0) return 'pending';
  if (paid >= total) return 'paid';
  return 'partial';
}

async function sumPaidForReference(referenceId, referenceModel) {
  const rows = await Payment.find({
    reference_id: referenceId,
    reference_model: referenceModel,
    is_deleted: false,
    status: { $ne: 'cancelled' },
  }).select('paid_amount').lean();

  return rows.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0);
}

async function syncReferencePaidAmount(referenceId, referenceModel) {
  const totalPaid = await sumPaidForReference(referenceId, referenceModel);

  if (referenceModel === 'Sale') {
    await Sale.findByIdAndUpdate(referenceId, { amount_received: totalPaid });
    return totalPaid;
  }

  if (referenceModel === 'PurchaseOrder') {
    await PurchaseOrder.findByIdAndUpdate(referenceId, { amount_paid: totalPaid });
    return totalPaid;
  }

  return totalPaid;
}

async function getOrderTotal(referenceId, referenceModel) {
  if (referenceModel === 'Sale') {
    const sale = await Sale.findById(referenceId).lean();
    return Number(sale?.net_amount || 0);
  }
  if (referenceModel === 'PurchaseOrder') {
    const po = await PurchaseOrder.findById(referenceId).lean();
    return netOrderTotal(po || {});
  }
  return 0;
}

async function getReferenceNo(referenceId, referenceModel) {
  if (!referenceId || !referenceModel) return '';
  if (referenceModel === 'Sale') {
    const sale = await Sale.findById(referenceId);
    if (!sale) return '';
    if (sale.invoice_no && String(sale.invoice_no).trim()) {
      return String(sale.invoice_no).trim();
    }
    sale.invoice_no = await generateSaleInvoiceNo(
      sale.admin_id,
      sale.sale_date || new Date(),
    );
    await sale.save();
    return sale.invoice_no;
  }
  if (referenceModel === 'PurchaseOrder') {
    const po = await PurchaseOrder.findById(referenceId).select('order_number').lean();
    return po?.order_number ? String(po.order_number).trim() : '';
  }
  return '';
}

/** Prefer linked sale/PO number from DB; fall back to value passed from controller. */
async function resolveReferenceNo(referenceId, referenceModel, fallback = '') {
  const fromDb = await getReferenceNo(referenceId, referenceModel);
  if (fromDb) return fromDb;
  return String(fallback || '').trim();
}

/**
 * Fill missing reference_no on payment list and persist fixes for old rows.
 */
async function enrichPayments(payments) {
  if (!payments?.length) return payments;

  const list = payments.map((p) => (p.toObject ? p.toObject() : { ...p }));
  const saleIds = [
    ...new Set(
      list
        .filter((p) => p.reference_model === 'Sale' && p.reference_id)
        .map((p) => String(p.reference_id)),
    ),
  ];
  const poIds = [
    ...new Set(
      list
        .filter((p) => p.reference_model === 'PurchaseOrder' && p.reference_id)
        .map((p) => String(p.reference_id)),
    ),
  ];

  const saleMap = {};
  const poMap = {};

  if (saleIds.length) {
    const sales = await Sale.find({ _id: { $in: saleIds } }).select('invoice_no').lean();
    sales.forEach((s) => {
      if (s.invoice_no) saleMap[String(s._id)] = String(s.invoice_no).trim();
    });
  }

  if (poIds.length) {
    const orders = await PurchaseOrder.find({ _id: { $in: poIds } })
      .select('order_number')
      .lean();
    orders.forEach((po) => {
      if (po.order_number) poMap[String(po._id)] = String(po.order_number).trim();
    });
  }

  await Promise.all(
    list.map(async (p) => {
      if (p.reference_no && String(p.reference_no).trim()) return;

      let refNo = '';
      if (p.reference_model === 'Sale') {
        refNo = saleMap[String(p.reference_id)] || '';
      } else if (p.reference_model === 'PurchaseOrder') {
        refNo = poMap[String(p.reference_id)] || '';
      }

      if (!refNo && p.reference_id && p.reference_model) {
        refNo = await getReferenceNo(p.reference_id, p.reference_model);
      }

      if (!refNo) return;

      p.reference_no = refNo;
      if (p._id) {
        await Payment.updateOne({ _id: p._id }, { $set: { reference_no: refNo } }).catch(() => {});
      }
    }),
  );

  return list;
}

/**
 * Record a payment line when saving a sale or purchase order.
 * Creates a payment for the delta between target paid total and existing payments.
 */
function resolvePartyFromType(paymentType, customerName = '', supplierName = '') {
  if (paymentType === 'sale') {
    return { partyType: 'customer', partyName: String(customerName || '').trim() || 'Walk-in Customer' };
  }
  return { partyType: 'supplier', partyName: String(supplierName || '').trim() || 'Supplier' };
}

async function recordPaymentFromOrder({
  adminId,
  userId,
  paymentType,
  referenceType,
  referenceId,
  referenceModel,
  customerId = null,
  supplierId = null,
  customerName = '',
  supplierName = '',
  referenceNo = '',
  paymentMethod = 'cash',
  targetPaidTotal,
  orderTotal,
  branchId = null,
  notes = '',
  paymentDate = new Date(),
  transactionId = '',
  bankName = '',
  chequeNo = '',
}) {
  const targetPaid = Math.max(0, Number(targetPaidTotal || 0));
  if (targetPaid <= 0) return null;

  const existingPaid = await sumPaidForReference(referenceId, referenceModel);
  const delta = targetPaid - existingPaid;
  if (delta <= 0) return null;

  const total =
    orderTotal != null ? Number(orderTotal) : await getOrderTotal(referenceId, referenceModel);
  const newTotalPaid = existingPaid + delta;
  const remaining = Math.max(0, total - newTotalPaid);
  const status = derivePaymentStatus(total, newTotalPaid);
  const transactionType = paymentType === 'sale' ? 'credit' : 'debit';
  const { partyType, partyName } = resolvePartyFromType(paymentType, customerName, supplierName);
  const savedReferenceNo = await resolveReferenceNo(referenceId, referenceModel, referenceNo);

  const payment = new Payment({
    payment_no: generatePaymentNo(),
    payment_type: paymentType,
    reference_type: referenceType,
    reference_id: referenceId,
    reference_model: referenceModel,
    reference_no: savedReferenceNo,
    customer: customerId || null,
    supplier: supplierId || null,
    party_type: partyType,
    party_name: partyName,
    payment_method: normalizePaymentMethod(paymentMethod),
    transaction_type: transactionType,
    amount: total,
    paid_amount: delta,
    remaining_amount: remaining,
    payment_date: paymentDate ? new Date(paymentDate) : new Date(),
    status,
    transaction_id: transactionId || '',
    bank_name: bankName || '',
    cheque_no: chequeNo || '',
    notes: notes || '',
    admin_id: adminId,
    created_by: userId,
    branch: branchId || null,
  });

  await payment.save();

  if (!payment.reference_no || !String(payment.reference_no).trim()) {
    const refNo = await resolveReferenceNo(referenceId, referenceModel, referenceNo);
    if (refNo) {
      payment.reference_no = refNo;
      await payment.save();
    }
  }

  await syncReferencePaidAmount(referenceId, referenceModel);
  await syncPaymentsReferenceForOrder(referenceId, referenceModel);
  return payment;
}

/** Keep all payment rows in sync when sale invoice / PO order number is known. */
async function syncPaymentsReferenceForOrder(referenceId, referenceModel, explicitNo = '') {
  if (!referenceId || !referenceModel) return;

  const refNo =
    String(explicitNo || '').trim() ||
    (await getReferenceNo(referenceId, referenceModel));
  if (!refNo) return;

  await Payment.updateMany(
    {
      reference_id: referenceId,
      reference_model: referenceModel,
      is_deleted: false,
    },
    { $set: { reference_no: refNo } },
  );
}

module.exports = {
  normalizePaymentMethod,
  generatePaymentNo,
  derivePaymentStatus,
  resolvePartyFromType,
  sumPaidForReference,
  syncReferencePaidAmount,
  getOrderTotal,
  getReferenceNo,
  resolveReferenceNo,
  enrichPayments,
  syncPaymentsReferenceForOrder,
  recordPaymentFromOrder,
};
