const Sale = require('../models/Sale');
const Products = require('../models/Products');
const Customer = require('../models/Customer');
const Return = require('../models/Return');
const { recordPaymentFromOrder, syncPaymentsReferenceForOrder } = require('../utils/paymentHelpers');
const { generateSaleInvoiceNo } = require('../utils/saleHelpers');

exports.getNextInvoiceNumber = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const saleDate = req.query.sale_date ? new Date(req.query.sale_date) : new Date();
    const invoice_no = await generateSaleInvoiceNo(adminId, saleDate);
    res.status(200).json({ invoice_no });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSale = async (req, res) => {
  try {
     const adminId =
      req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const data = {
      ...req.body,
      admin_id: adminId,
      created_by: req.user._id,
    };

    const saleDate = data.sale_date ? new Date(data.sale_date) : new Date();
    if (!data.invoice_no || !String(data.invoice_no).trim()) {
      data.invoice_no = await generateSaleInvoiceNo(adminId, saleDate);
    } else {
      data.invoice_no = String(data.invoice_no).trim();
    }

    if (data.customer_id && !data.customer_name) {
      const customer = await Customer.findById(data.customer_id);
      if (customer) data.customer_name = customer.name;
    }

    const newSale = new Sale(data);
    await newSale.save();

    const amountReceived = Math.max(
      0,
      Number(data.amount_received ?? data.amount_paid ?? 0),
    );
    if (amountReceived > 0) {
      let customerId = null;
      if (newSale.customer_id) {
        const customer = await Customer.findById(newSale.customer_id);
        if (customer) customerId = customer._id;
      }
      await recordPaymentFromOrder({
        adminId,
        userId: req.user._id,
        paymentType: 'sale',
        referenceType: 'sale_order',
        referenceId: newSale._id,
        referenceModel: 'Sale',
        customerId,
        customerName: newSale.customer_name || data.customer_name || '',
        referenceNo: newSale.invoice_no || data.invoice_no || '',
        paymentMethod: data.payment_method || data.payment_mode || 'cash',
        targetPaidTotal: amountReceived,
        orderTotal: Number(newSale.net_amount || 0),
        branchId: data.branch || null,
        notes: data.payment_notes || '',
        paymentDate: data.payment_date || newSale.sale_date,
      });
    }

    await syncPaymentsReferenceForOrder(newSale._id, 'Sale', newSale.invoice_no);

    const refreshed = await Sale.findById(newSale._id);
    res.status(201).json(refreshed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const query = {
      admin_id: adminId,
    };

    if (req.user.user_type === 'user') {
      query.created_by = req.user.id;
    }

    const sales = await Sale.find(query).lean();
    if (!sales.length) {
      return res.status(200).json([]);
    }

    const saleIds = sales.map((s) => s._id);
    const returnRows = await Return.find({
      sale_id: { $in: saleIds },
      status: { $in: ['approved', 'pending'] },
    })
      .select('sale_id product_id quantity')
      .lean();

    const returnedBySaleProduct = {};
    returnRows.forEach((r) => {
      const sid = r.sale_id.toString();
      const pid = r.product_id.toString();
      if (!returnedBySaleProduct[sid]) returnedBySaleProduct[sid] = {};
      returnedBySaleProduct[sid][pid] =
        (returnedBySaleProduct[sid][pid] || 0) + Number(r.quantity || 0);
    });

    const enriched = sales.map((s) => ({
      ...s,
      returned_qty_by_product: returnedBySaleProduct[s._id.toString()] || {},
    }));

    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkFacultyAccess = async (id, user) => {
  const faculty = await Sale.findById(id);
  if (!faculty) throw new Error('Faculty not found');

  const loggedInAdminId = user.user_type === 'admin' ? user._id : user.admin_id;
  if (faculty.admin_id.toString() !== loggedInAdminId.toString()) {
    throw new Error('Unauthorized access');
  }

  return faculty;
};

exports.updateSale = async (req, res) => {
  try {
    await checkFacultyAccess(req.params.id, req.user);

    const updated = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
  await checkFacultyAccess(req.params.id, req.user);
    await Sale.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Sale deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createBilling = async (req, res) => {
  try {
    const {
      customer_id,
      discount_amount = 0,
      tax_amount = 0,
      sale_date,
      items = [],
      amount_received,
      payment_mode,
      payment_method,
      branch,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one billing item is required' });
    }

    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    let customerName = 'Walk-in Customer';
    if (customer_id) {
      const customer = await Customer.findById(customer_id);
      if (customer) customerName = customer.name;
    } else if (req.user?.name) {
      customerName = req.user.name;
    }

    const saleItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Products.findById(item.product_id);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.product_id}` });
      }

      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity for ${product.name}` });
      }

      if (product.available_quantity < quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.available_quantity}`,
        });
      }

      const unitPrice = Number(item.unit_price ?? product.unit_price ?? 0);
      const lineDiscount = Number(item.discount || 0);
      const lineTax = Number(item.tax || 0);
      const lineTotal = quantity * unitPrice - lineDiscount + lineTax;

      saleItems.push({
        product_id: product._id,
        product_name: product.name,
        quantity,
        unit_price: unitPrice,
        discount: lineDiscount,
        tax: lineTax,
        line_total: lineTotal,
      });

      totalAmount += lineTotal;
    }

    const netAmount = totalAmount - Number(discount_amount || 0) + Number(tax_amount || 0);
    const billDate = sale_date ? new Date(sale_date) : new Date();
    let invoiceNo = req.body.invoice_no || req.body.invoice_number || '';
    if (!invoiceNo || !String(invoiceNo).trim()) {
      invoiceNo = await generateSaleInvoiceNo(adminId, billDate);
    } else {
      invoiceNo = String(invoiceNo).trim();
    }

    const billing = new Sale({
      invoice_no: invoiceNo,
      customer_id: customer_id || null,
      customer_name: customerName,
      items: saleItems,
      total_amount: totalAmount,
      discount_amount: Number(discount_amount || 0),
      tax_amount: Number(tax_amount || 0),
      net_amount: netAmount,
      status: 'completed',
      sale_date: billDate,
      admin_id: adminId,
      created_by: req.user._id,
    });

    await billing.save();

    const received = Math.max(
      0,
      Number(amount_received != null ? amount_received : netAmount),
    );
    if (received > 0) {
      let customerObjId = null;
      if (customer_id) {
        const customer = await Customer.findById(customer_id);
        if (customer) customerObjId = customer._id;
      }
      await recordPaymentFromOrder({
        adminId,
        userId: req.user._id,
        paymentType: 'sale',
        referenceType: 'sale_order',
        referenceId: billing._id,
        referenceModel: 'Sale',
        customerId: customerObjId,
        customerName: billing.customer_name || customerName,
        referenceNo: billing.invoice_no || '',
        paymentMethod: payment_method || payment_mode || 'cash',
        targetPaidTotal: received,
        orderTotal: netAmount,
        branchId: branch || null,
        paymentDate: billing.sale_date,
      });
    }

    for (const item of saleItems) {
      const product = await Products.findById(item.product_id);
      if (product) {
        product.available_quantity = Math.max(0, product.available_quantity - item.quantity);
        product.total_value = product.available_quantity * product.unit_price;
        await product.save();
      }
    }

    await syncPaymentsReferenceForOrder(billing._id, 'Sale', billing.invoice_no);

    const refreshedBilling = await Sale.findById(billing._id);
    res.status(201).json(refreshedBilling);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).lean();
    if (!sale) return res.status(404).json({ error: 'Invoice not found' });

    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    if (sale.admin_id.toString() !== adminId.toString()) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.status(200).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
