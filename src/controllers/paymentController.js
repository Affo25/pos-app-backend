const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const PurchaseOrder = require('../models/PurchaseOrder');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const {
  generatePaymentNo,
  derivePaymentStatus,
  normalizePaymentMethod,
  resolvePartyFromType,
  syncReferencePaidAmount,
  getOrderTotal,
  sumPaidForReference,
  resolveReferenceNo,
  enrichPayments,
  syncPaymentsReferenceForOrder,
} = require('../utils/paymentHelpers');

const populateOpts = [
  { path: 'customer', select: 'name phone email' },
  { path: 'supplier', select: 'name phone email' },
  { path: 'created_by', select: 'name email' },
  { path: 'branch', select: 'branch_name' },
];

function getAdminId(user) {
  return user.user_type === 'admin' ? user._id : user.admin_id;
}

async function checkPaymentAccess(id, user) {
  const payment = await Payment.findById(id);
  if (!payment || payment.is_deleted) {
    throw new Error('Payment not found');
  }
  const adminId = getAdminId(user);
  if (payment.admin_id.toString() !== adminId.toString()) {
    throw new Error('Unauthorized access');
  }
  return payment;
}

async function resolveReference(referenceType, referenceId, adminId) {
  if (referenceType === 'sale_order') {
    const sale = await Sale.findById(referenceId);
    if (!sale || sale.admin_id.toString() !== adminId.toString()) {
      throw new Error('Sale not found');
    }
    let customerId = null;
    let customerName = sale.customer_name || '';
    if (sale.customer_id) {
      const customer = await Customer.findById(sale.customer_id);
      if (customer) {
        customerId = customer._id;
        if (!customerName) customerName = customer.name;
      }
    }
    if (!customerName) customerName = 'Walk-in Customer';
    return {
      paymentType: 'sale',
      referenceModel: 'Sale',
      referenceType: 'sale_order',
      customerId,
      supplierId: null,
      customerName,
      supplierName: '',
      referenceNo: sale.invoice_no || '',
      orderTotal: Number(sale.net_amount || 0),
    };
  }

  if (referenceType === 'purchase_order') {
    const po = await PurchaseOrder.findById(referenceId).populate('supplier_id', 'name');
    if (!po || po.admin_id.toString() !== adminId.toString()) {
      throw new Error('Purchase order not found');
    }
    let supplierName = po.supplier_name || '';
    if (!supplierName && po.supplier_id?.name) {
      supplierName = po.supplier_id.name;
    }
    if (!supplierName && po.supplier_id) {
      const supplier = await Supplier.findById(po.supplier_id._id || po.supplier_id);
      if (supplier) supplierName = supplier.name;
    }
    return {
      paymentType: 'purchase',
      referenceModel: 'PurchaseOrder',
      referenceType: 'purchase_order',
      customerId: null,
      supplierId: po.supplier_id?._id || po.supplier_id,
      customerName: '',
      supplierName: supplierName || 'Supplier',
      referenceNo: po.order_number || '',
      orderTotal: await getOrderTotal(referenceId, 'PurchaseOrder'),
    };
  }

  throw new Error('Invalid reference_type');
}

exports.getPayments = async (req, res) => {
  try {
    const adminId = getAdminId(req.user);
    const query = { admin_id: adminId, is_deleted: false };

    if (req.user.user_type === 'user') {
      query.created_by = req.user._id || req.user.id;
    }

    if (req.query.payment_type) {
      query.payment_type = req.query.payment_type;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.reference_id) {
      query.reference_id = req.query.reference_id;
    }

    const payments = await Payment.find(query)
      .populate(populateOpts)
      .sort({ payment_date: -1, createdAt: -1 });

    const enriched = await enrichPayments(payments);
    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const payment = await checkPaymentAccess(req.params.id, req.user);
    const populated = await Payment.findById(payment._id).populate(populateOpts);
    const [enriched] = await enrichPayments([populated]);
    res.status(200).json(enriched || populated);
  } catch (err) {
    res.status(err.message === 'Payment not found' ? 404 : 500).json({ error: err.message });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const adminId = getAdminId(req.user);
    const {
      payment_type,
      reference_type,
      reference_id,
      customer,
      supplier,
      payment_method,
      paid_amount,
      payment_date,
      due_date,
      transaction_id,
      bank_name,
      cheque_no,
      notes,
      branch,
    } = req.body;

    if (!reference_type || !reference_id) {
      return res.status(400).json({ error: 'reference_type and reference_id are required' });
    }

    const paid = Math.max(0, Number(paid_amount || 0));
    if (paid <= 0) {
      return res.status(400).json({ error: 'paid_amount must be greater than 0' });
    }

    const ref = await resolveReference(reference_type, reference_id, adminId);
    const existingPaid = await sumPaidForReference(reference_id, ref.referenceModel);
    const orderTotal = ref.orderTotal;
    const newTotalPaid = existingPaid + paid;

    if (newTotalPaid > orderTotal) {
      return res.status(400).json({
        error: `Payment exceeds order balance. Maximum additional: ${Math.max(0, orderTotal - existingPaid)}`,
      });
    }

    const remaining = Math.max(0, orderTotal - newTotalPaid);
    const status = derivePaymentStatus(orderTotal, newTotalPaid);
    const transactionType = (payment_type || ref.paymentType) === 'sale' ? 'credit' : 'debit';
    const effectiveType = payment_type || ref.paymentType;
    const { partyType, partyName } = resolvePartyFromType(
      effectiveType,
      req.body.customer_name || ref.customerName,
      req.body.supplier_name || ref.supplierName,
    );

    const payment = new Payment({
      payment_no: generatePaymentNo(),
      payment_type: effectiveType,
      reference_type: ref.referenceType,
      reference_id,
      reference_model: ref.referenceModel,
      customer: customer || ref.customerId || null,
      supplier: supplier || ref.supplierId || null,
      party_type: partyType,
      party_name: partyName,
      reference_no: await resolveReferenceNo(
        reference_id,
        ref.referenceModel,
        req.body.reference_no || ref.referenceNo,
      ),
      payment_method: normalizePaymentMethod(payment_method),
      transaction_type: transactionType,
      amount: orderTotal,
      paid_amount: paid,
      remaining_amount: remaining,
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      due_date: due_date ? new Date(due_date) : null,
      status,
      transaction_id: transaction_id || '',
      bank_name: bank_name || '',
      cheque_no: cheque_no || '',
      notes: notes || '',
      admin_id: adminId,
      created_by: req.user._id,
      branch: branch || null,
    });

    await payment.save();
    await syncReferencePaidAmount(reference_id, ref.referenceModel);
    await syncPaymentsReferenceForOrder(reference_id, ref.referenceModel);

    const populated = await Payment.findById(payment._id).populate(populateOpts);
    const [enriched] = await enrichPayments([populated]);
    res.status(201).json(enriched || populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelPayment = async (req, res) => {
  try {
    const payment = await checkPaymentAccess(req.params.id, req.user);
    payment.status = 'cancelled';
    payment.is_deleted = true;
    await payment.save();
    await syncReferencePaidAmount(payment.reference_id, payment.reference_model);
    res.status(200).json({ message: 'Payment cancelled' });
  } catch (err) {
    res.status(err.message === 'Payment not found' ? 404 : 500).json({ error: err.message });
  }
};
