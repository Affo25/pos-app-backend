const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const { enrichPurchaseOrder, netOrderTotal, orderAmountPaid } = require('../utils/purchaseOrderHelpers');

exports.createSupplier = async (req, res) => {
  try {
     const adminId =
      req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const data = {
      ...req.body,
      admin_id: adminId,
      created_by: req.user._id,
    };

    const newSupplier = new Supplier(data);
    await newSupplier.save();
    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const suppliers = await Supplier.find({ admin_id: adminId });
    res.status(200).json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkFacultyAccess = async (id, user) => {
  const faculty = await Supplier.findById(id);
  if (!faculty) throw new Error('Faculty not found');

  const loggedInAdminId = user.user_type === 'admin' ? user._id : user.admin_id;
  if (faculty.admin_id.toString() !== loggedInAdminId.toString()) {
    throw new Error('Unauthorized access');
  }

  return faculty;
};

exports.updateSupplier = async (req, res) => {
  try {
    await checkFacultyAccess(req.params.id, req.user);

    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
  await checkFacultyAccess(req.params.id, req.user);
    await Supplier.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSupplierLedger = async (req, res) => {
  try {
    const supplier = await checkFacultyAccess(req.params.id, req.user);
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const orders = await PurchaseOrder.find({
      supplier_id: supplier._id,
      admin_id: adminId,
    })
      .populate('items.product_id', 'name')
      .populate('returns.product_id', 'name')
      .sort({ order_date: -1 });

    const enrichedOrders = orders.map((po) => enrichPurchaseOrder(po));

    const openingBalance = Number(supplier.opening_balance || 0);
    let totalOrderValue = 0;
    let totalReturned = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    enrichedOrders.forEach((po) => {
      if (po.status === 'cancelled') return;
      totalOrderValue += Number(po.order_total || 0);
      totalReturned += Number(po.returned_total || 0);
      totalPaid += orderAmountPaid(po);
      totalRemaining += Number(po.amount_remaining || 0);
    });

    const netPurchases = enrichedOrders
      .filter((po) => po.status !== 'cancelled')
      .reduce((sum, po) => sum + netOrderTotal(po), 0);

    const supplierBalance = openingBalance + totalRemaining;

    res.status(200).json({
      supplier: {
        _id: supplier._id,
        name: supplier.name,
        opening_balance: openingBalance,
        opening_balance_note: supplier.opening_balance_note || '',
      },
      summary: {
        opening_balance: openingBalance,
        total_order_value: totalOrderValue,
        total_returned: totalReturned,
        net_purchases: netPurchases,
        total_paid: totalPaid,
        total_remaining_on_orders: totalRemaining,
        supplier_balance: supplierBalance,
      },
      orders: enrichedOrders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
