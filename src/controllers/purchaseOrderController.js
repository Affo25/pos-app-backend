const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Products = require('../models/Products');
const {
  enrichPurchaseOrder,
  netOrderTotal,
  returnedQtyForProduct,
  orderedQtyForProduct,
  generatePurchaseOrderNumber,
} = require('../utils/purchaseOrderHelpers');
const { recordPaymentFromOrder, syncPaymentsReferenceForOrder } = require('../utils/paymentHelpers');

const populateOpts = [
  { path: 'supplier_id', select: 'name address phone email opening_balance opening_balance_note' },
  { path: 'items.product_id', select: 'name unit_price' },
  { path: 'returns.product_id', select: 'name unit_price' },
];

async function adjustProductStock(productId, deltaQty) {
  const product = await Products.findById(productId);
  if (!product) return;
  product.available_quantity = Math.max(0, Number(product.available_quantity || 0) + Number(deltaQty));
  product.total_value = product.available_quantity * Number(product.unit_price || 0);
  await product.save();
}

async function applyItemsStockDelta(items, direction) {
  for (const line of items || []) {
    const pid = line.product_id?._id || line.product_id;
    if (!pid) continue;
    await adjustProductStock(pid, direction * Number(line.quantity || 0));
  }
}

const checkPurchaseOrderAccess = async (id, user) => {
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) throw new Error('PurchaseOrder not found');

  const loggedInAdminId = user.user_type === 'admin' ? user._id : user.admin_id;
  if (purchaseOrder.admin_id.toString() !== loggedInAdminId.toString()) {
    throw new Error('Unauthorized access');
  }

  return purchaseOrder;
};

async function resolveSupplierName(supplierId, fallback = '') {
  if (fallback && String(fallback).trim()) return String(fallback).trim();
  if (!supplierId) return '';
  const supplier = await Supplier.findById(supplierId).select('name').lean();
  return supplier?.name || '';
}

function sanitizePayload(body) {
  const data = { ...body };
  if (data.amount_paid !== undefined) {
    data.amount_paid = Math.max(0, Number(data.amount_paid) || 0);
  }
  if (Array.isArray(data.items)) {
    data.items = data.items.map((it) => ({
      product_id: it.product_id,
      quantity: Number(it.quantity),
      price: Number(it.price),
    }));
  }
  delete data.returns;
  delete data.order_total;
  delete data.net_total;
  delete data.amount_remaining;
  return data;
}

exports.getNextOrderNumber = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const orderDate = req.query.order_date ? new Date(req.query.order_date) : new Date();
    const order_number = await generatePurchaseOrderNumber(adminId, orderDate);
    res.status(200).json({ order_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const data = sanitizePayload({
      ...req.body,
      admin_id: adminId,
      created_by: req.user._id,
      returns: [],
    });

    const orderDate = data.order_date ? new Date(data.order_date) : new Date();
    if (!data.order_number || !String(data.order_number).trim()) {
      data.order_number = await generatePurchaseOrderNumber(adminId, orderDate);
    } else {
      data.order_number = String(data.order_number).trim();
    }

    data.supplier_name = await resolveSupplierName(
      data.supplier_id,
      data.supplier_name || req.body.supplier_name,
    );

    const draft = new PurchaseOrder(data);
    const net = netOrderTotal(draft);
    if (data.amount_paid > net) {
      return res.status(400).json({ error: 'Amount paid cannot exceed order total' });
    }

    const newPurchaseOrder = new PurchaseOrder(data);
    await newPurchaseOrder.save();

    if (newPurchaseOrder.status === 'received') {
      await applyItemsStockDelta(newPurchaseOrder.items, 1);
    }

    const paidAmount = Math.max(0, Number(data.amount_paid || 0));
    if (paidAmount > 0) {
      await recordPaymentFromOrder({
        adminId,
        userId: req.user._id,
        paymentType: 'purchase',
        referenceType: 'purchase_order',
        referenceId: newPurchaseOrder._id,
        referenceModel: 'PurchaseOrder',
        supplierId: newPurchaseOrder.supplier_id,
        supplierName: newPurchaseOrder.supplier_name,
        referenceNo: newPurchaseOrder.order_number || '',
        paymentMethod: data.payment_method || 'bank_transfer',
        targetPaidTotal: paidAmount,
        orderTotal: net,
        branchId: data.branch || null,
        notes: data.payment_notes || '',
        paymentDate: newPurchaseOrder.order_date,
        transactionId: data.transaction_id || '',
        bankName: data.bank_name || '',
      });
    }

    await syncPaymentsReferenceForOrder(
      newPurchaseOrder._id,
      'PurchaseOrder',
      newPurchaseOrder.order_number,
    );

    const populatedOrder = await PurchaseOrder.findById(newPurchaseOrder._id).populate(populateOpts);
    res.status(201).json(enrichPurchaseOrder(populatedOrder));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPurchaseOrders = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const query = { admin_id: adminId };

    if (req.user.user_type === 'user') {
      query.created_by = req.user.id || req.user._id;
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate(populateOpts)
      .sort({ createdAt: -1 });

    res.status(200).json(purchaseOrders.map((po) => enrichPurchaseOrder(po)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    await checkPurchaseOrderAccess(req.params.id, req.user);
    const po = await PurchaseOrder.findById(req.params.id).populate(populateOpts);
    res.status(200).json(enrichPurchaseOrder(po));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const existing = await checkPurchaseOrderAccess(req.params.id, req.user);
    const prevStatus = existing.status;
    const updateData = sanitizePayload(req.body);

    const merged = { ...existing.toObject(), ...updateData };
    const net = netOrderTotal(merged);
    const paid = Math.max(0, Number(updateData.amount_paid ?? existing.amount_paid ?? 0));
    if (paid > net) {
      return res.status(400).json({ error: 'Amount paid cannot exceed net order total' });
    }
    updateData.amount_paid = paid;

    if (updateData.supplier_id) {
      updateData.supplier_name = await resolveSupplierName(
        updateData.supplier_id,
        updateData.supplier_name || req.body.supplier_name,
      );
    } else if (req.body.supplier_name) {
      updateData.supplier_name = String(req.body.supplier_name).trim();
    }

    const updated = await PurchaseOrder.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate(populateOpts);

    const newStatus = updated.status;
    if (prevStatus !== 'received' && newStatus === 'received') {
      await applyItemsStockDelta(updated.items, 1);
    } else if (prevStatus === 'received' && newStatus !== 'received') {
      await applyItemsStockDelta(existing.items, -1);
    }

    const prevPaid = Math.max(0, Number(existing.amount_paid || 0));
    if (paid > prevPaid) {
      const netAfter = netOrderTotal(updated);
      await recordPaymentFromOrder({
        adminId: req.user.user_type === 'admin' ? req.user._id : req.user.admin_id,
        userId: req.user._id,
        paymentType: 'purchase',
        referenceType: 'purchase_order',
        referenceId: updated._id,
        referenceModel: 'PurchaseOrder',
        supplierId: updated.supplier_id,
        supplierName: updated.supplier_name,
        referenceNo: updated.order_number || '',
        paymentMethod: updateData.payment_method || 'bank_transfer',
        targetPaidTotal: paid,
        orderTotal: netAfter,
        branchId: updateData.branch || null,
        notes: updateData.payment_notes || 'Purchase order payment update',
        paymentDate: updated.order_date,
        transactionId: updateData.transaction_id || '',
        bankName: updateData.bank_name || '',
      });
    }

    await syncPaymentsReferenceForOrder(updated._id, 'PurchaseOrder', updated.order_number);

    const repopulated = await PurchaseOrder.findById(updated._id).populate(populateOpts);
    res.status(200).json(enrichPurchaseOrder(repopulated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addPurchaseOrderReturn = async (req, res) => {
  try {
    const po = await checkPurchaseOrderAccess(req.params.id, req.user);
    const { product_id, quantity, price, reason } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ error: 'product_id and quantity are required' });
    }

    const qty = Number(quantity);
    const unitPrice = Number(price ?? 0);
    if (qty < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const ordered = orderedQtyForProduct(po, product_id);
    const alreadyReturned = returnedQtyForProduct(po, product_id);
    if (ordered <= 0) {
      return res.status(400).json({ error: 'Product is not on this purchase order' });
    }
    if (alreadyReturned + qty > ordered) {
      return res.status(400).json({
        error: `Cannot return more than ordered (max ${ordered - alreadyReturned} remaining)`,
      });
    }

    const line = po.items.find((it) => String(it.product_id) === String(product_id));
    const returnPrice = unitPrice >= 0 ? unitPrice : Number(line?.price || 0);

    po.returns.push({
      product_id,
      quantity: qty,
      price: returnPrice,
      reason: reason || '',
      return_date: new Date(),
    });

    const paid = Number(po.amount_paid || 0);
    const net = netOrderTotal({ ...po.toObject(), returns: po.returns });
    if (paid > net) {
      po.amount_paid = net;
    }

    await po.save();

    if (po.status === 'received') {
      await adjustProductStock(product_id, -qty);
    }

    const populated = await PurchaseOrder.findById(po._id).populate(populateOpts);
    res.status(201).json(enrichPurchaseOrder(populated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const po = await checkPurchaseOrderAccess(req.params.id, req.user);
    if (po.status === 'received') {
      await applyItemsStockDelta(po.items, -1);
      for (const ret of po.returns || []) {
        await adjustProductStock(ret.product_id, Number(ret.quantity || 0));
      }
    }
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'PurchaseOrder deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
