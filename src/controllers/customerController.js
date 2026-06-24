const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { enrichSale, saleNetTotal, saleAmountReceived } = require('../utils/saleHelpers');

exports.createCustomer = async (req, res) => {
  try {
     const adminId =
      req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const data = {
      ...req.body,
      admin_id: adminId,
      created_by: req.user._id,
    };

    const newCustomer = new Customer(data);
    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const query = {
      admin_id: adminId,
    };

    if (req.user.user_type === 'user') {
      query.created_by = req.user.id;
    }

    const customers = await Customer.find(query);
    res.status(200).json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkFacultyAccess = async (id, user) => {
  const faculty = await Customer.findById(id);
  if (!faculty) throw new Error('Faculty not found');

  const loggedInAdminId = user.user_type === 'admin' ? user._id : user.admin_id;
  if (faculty.admin_id.toString() !== loggedInAdminId.toString()) {
    throw new Error('Unauthorized access');
  }

  return faculty;
};

exports.updateCustomer = async (req, res) => {
  try {
    await checkFacultyAccess(req.params.id, req.user);

    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
  await checkFacultyAccess(req.params.id, req.user);
    await Customer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomerLedger = async (req, res) => {
  try {
    const customer = await checkFacultyAccess(req.params.id, req.user);
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const customerIdStr = String(customer._id);

    const saleQuery = {
      customer_id: customerIdStr,
      admin_id: adminId,
    };
    if (req.user.user_type === 'user') {
      saleQuery.created_by = req.user.id || req.user._id;
    }

    const sales = await Sale.find(saleQuery).sort({ sale_date: -1 });
    const enrichedSales = sales.map((s) => enrichSale(s));

    const openingBalance = Number(customer.opening_balance || 0);
    let totalSaleValue = 0;
    let totalReturned = 0;
    let totalReceived = 0;
    let totalRemaining = 0;

    enrichedSales.forEach((sale) => {
      if (sale.status === 'cancelled') return;
      totalSaleValue += Number(sale.total_amount || 0);
      totalReturned += Number(sale.returned_total || 0);
      totalReceived += saleAmountReceived(sale);
      totalRemaining += Number(sale.amount_remaining || 0);
    });

    const netSales = enrichedSales
      .filter((sale) => sale.status !== 'cancelled')
      .reduce((sum, sale) => sum + saleNetTotal(sale), 0);

    const customerBalance = openingBalance + totalRemaining;

    res.status(200).json({
      customer: {
        _id: customer._id,
        name: customer.name,
        opening_balance: openingBalance,
        opening_balance_note: customer.opening_balance_note || '',
      },
      summary: {
        opening_balance: openingBalance,
        total_sale_value: totalSaleValue,
        total_returned: totalReturned,
        net_sales: netSales,
        total_received: totalReceived,
        total_remaining_on_sales: totalRemaining,
        customer_balance: customerBalance,
      },
      sales: enrichedSales,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
