const Return = require('../models/Return');
const Sale = require('../models/Sale');
const Products = require('../models/Products');
const { applyReturnsToSaleLineItems, maxReturnableQty } = require('../utils/saleHelpers');

exports.createReturn = async (req, res) => {
  try {
    const { sale_id, items, reason } = req.body;

    // Validate input
    if (!sale_id || !items || !items.length) {
      return res.status(400).json({ 
        success: false,
        error: 'Sale ID and return items are required' 
      });
    }

    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    // Check if sale exists
    const sale = await Sale.findById(sale_id);
    if (!sale) {
      return res.status(404).json({ 
        success: false,
        error: 'Sale not found' 
      });
    }

    // Check if sale is eligible for return
    if (sale.status === 'returned') {
      return res.status(400).json({ 
        success: false,
        error: 'This sale has already been fully returned' 
      });
    }

    const createdReturns = [];
    const errors = [];

    for (const item of items) {
      const { product_id, quantity, unit_price, reason: itemReason } = item;

      // Validate quantity
      if (!quantity || quantity <= 0) {
        errors.push(`Invalid quantity for product ${product_id}`);
        continue;
      }

      // Check if product was part of the sale
      const saleItem = sale.items.find(si => si.product_id.toString() === product_id.toString());
      if (!saleItem) {
        errors.push(`Product ${product_id} not found in this sale`);
        continue;
      }

      const existingReturns = await Return.find({
        sale_id,
        product_id,
        status: { $in: ['pending', 'approved'] }
      });

      const totalAlreadyReturned = existingReturns.reduce((sum, r) => sum + r.quantity, 0);
      const maxReturnable = maxReturnableQty(saleItem.quantity, totalAlreadyReturned);

      if (quantity > maxReturnable) {
        errors.push(
          `Return quantity for ${saleItem.product_name} cannot exceed ${maxReturnable} (already returned: ${totalAlreadyReturned})`,
        );
        continue;
      }

      // Create return record
      const newReturn = new Return({
        sale_id,
        product_id,
        quantity: Number(quantity),
        unit_price: unit_price || saleItem.unit_price,
        reason: itemReason || reason || 'No reason provided',
        admin_id: adminId,
        created_by: req.user._id,
        status: 'approved', // Auto-approve for now
        refund_amount: Number(quantity) * (unit_price || saleItem.unit_price)
      });

      await newReturn.save();
      createdReturns.push(newReturn);

      // Update product stock - INCREASE stock by returned quantity
      const product = await Products.findById(product_id);
      if (product) {
        // Increase available quantity
        const previousQuantity = product.available_quantity;
        product.available_quantity = Number(product.available_quantity) + Number(quantity);
        
        // Recalculate total value
        product.total_value = product.available_quantity * product.unit_price;
        
        // Save the product
        await product.save();
        
        console.log(`Stock updated for ${product.name}: ${previousQuantity} → ${product.available_quantity} (+${quantity})`);
      }
    }

    // If there were errors, return them
    if (errors.length > 0 && createdReturns.length === 0) {
      return res.status(400).json({
        success: false,
        errors: errors
      });
    }

    // Update sale status based on returns
    // Get all returns for this sale (including existing ones)
    const allReturns = await Return.find({ 
      sale_id,
      status: { $in: ['approved', 'pending'] }
    });
    
    // Calculate total returned quantity per product
    const returnMap = new Map();
    allReturns.forEach(ret => {
      const key = ret.product_id.toString();
      const current = returnMap.get(key) || 0;
      returnMap.set(key, current + ret.quantity);
    });

    applyReturnsToSaleLineItems(sale, returnMap);

    const allItemsFullyReturned = sale.items.length === 0;
    
    // Update sale status
    if (allItemsFullyReturned) {
      sale.status = 'returned';
    } else if (allReturns.length > 0 && sale.status !== 'returned') {
      sale.status = 'partially_returned';
    }
    
    // Store return information in sale
    sale.return_items = sale.return_items || [];
    sale.return_items.push(...createdReturns.map((r) => ({
      return_id: r._id,
      product_id: r.product_id,
      quantity: r.quantity,
      unit_price: r.unit_price,
      reason: r.reason,
      created_at: r.createdAt || new Date(),
      refund_amount: r.refund_amount,
    })));
    
    // Calculate total return amount and reduce invoice net (amount still valid after returns)
    const batchRefund = createdReturns.reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);
    sale.total_return_amount = (Number(sale.total_return_amount) || 0) + batchRefund;
    sale.net_amount = Math.max(0, Number(sale.net_amount || 0) - batchRefund);

    await sale.save();

    // Populate the returns with product details for response
    const populatedReturns = await Return.find({ _id: { $in: createdReturns.map(r => r._id) } })
      .populate({
        path: 'product_id',
        select: 'name batch_number unit_price category',
        populate: { path: 'category', select: 'name' },
      })
      .populate('sale_id', 'invoice_no customer_name total_amount net_amount')
      .populate('created_by', 'name email');

    const updatedSale = await Sale.findById(sale_id).lean();

    res.status(201).json({
      success: true,
      message: 'Return processed successfully',
      returns: populatedReturns,
      sale: updatedSale,
      sale_status: sale.status,
      total_return_amount: sale.total_return_amount,
      net_amount: sale.net_amount,
      summary: {
        total_items_returned: createdReturns.length,
        total_quantity_returned: createdReturns.reduce((sum, r) => sum + r.quantity, 0),
        total_refund_amount: sale.total_return_amount,
        batch_refund: batchRefund,
        errors: errors.length > 0 ? errors : null,
      },
    });
  } catch (err) {
    console.error('Return processing error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const query = { admin_id: adminId };
    
    // Add filters from query params
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.sale_id) {
      query.sale_id = req.query.sale_id;
    }
    if (req.query.product_id) {
      query.product_id = req.query.product_id;
    }
    if (req.query.start_date && req.query.end_date) {
      query.return_date = {
        $gte: new Date(req.query.start_date),
        $lte: new Date(req.query.end_date)
      };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const returns = await Return.find(query)
      .populate('sale_id', 'invoice_no customer_name total_amount net_amount sale_date')
      .populate({
        path: 'product_id',
        select: 'name batch_number unit_price category',
        populate: { path: 'category', select: 'name' },
      })
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Return.countDocuments(query);

    // Calculate summary
    const summary = {
      total_returns: total,
      total_items: returns.length,
      total_quantity: returns.reduce((sum, r) => sum + r.quantity, 0),
      total_refund_amount: returns.reduce((sum, r) => sum + (r.refund_amount || 0), 0),
      by_status: {
        approved: returns.filter(r => r.status === 'approved').length,
        pending: returns.filter(r => r.status === 'pending').length,
        rejected: returns.filter(r => r.status === 'rejected').length
      }
    };

    res.status(200).json({
      success: true,
      returns,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get returns error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

exports.getReturnsBySale = async (req, res) => {
  try {
    const { sale_id } = req.params;
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    if (!sale_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Sale ID is required' 
      });
    }

    const returns = await Return.find({ 
      sale_id, 
      admin_id: adminId 
    })
      .populate({
        path: 'product_id',
        select: 'name batch_number unit_price category',
        populate: { path: 'category', select: 'name' },
      })
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 });

    // Calculate summary for this sale
    const summary = {
      total_returns: returns.length,
      total_quantity: returns.reduce((sum, r) => sum + r.quantity, 0),
      total_refund: returns.reduce((sum, r) => sum + (r.refund_amount || 0), 0),
      by_status: {
        approved: returns.filter(r => r.status === 'approved').length,
        pending: returns.filter(r => r.status === 'pending').length,
        rejected: returns.filter(r => r.status === 'rejected').length
      }
    };

    res.status(200).json({
      success: true,
      returns,
      summary
    });
  } catch (err) {
    console.error('Get returns by sale error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

exports.updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid status. Must be pending, approved, or rejected' 
      });
    }

    const returnRecord = await Return.findById(id);
    if (!returnRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Return record not found' 
      });
    }

    const previousStatus = returnRecord.status;

    // Handle stock updates based on status change
    if (status === 'approved' && previousStatus === 'pending') {
      // Approving a pending return - increase stock
      const product = await Products.findById(returnRecord.product_id);
      if (product) {
        product.available_quantity += returnRecord.quantity;
        product.total_value = product.available_quantity * product.unit_price;
        await product.save();
        console.log(`Stock increased for ${product.name}: +${returnRecord.quantity}`);
      }
    } 
    else if (status === 'rejected' && previousStatus === 'approved') {
      // Rejecting an approved return - revert stock
      const product = await Products.findById(returnRecord.product_id);
      if (product) {
        product.available_quantity -= returnRecord.quantity;
        product.total_value = product.available_quantity * product.unit_price;
        await product.save();
        console.log(`Stock decreased for ${product.name}: -${returnRecord.quantity}`);
      }
    }

    returnRecord.status = status;
    await returnRecord.save();

    // If this is the last return for a sale, update sale status if needed
    if (status === 'rejected') {
      const sale = await Sale.findById(returnRecord.sale_id);
      if (sale && sale.status === 'partially_returned') {
        // Check if there are any other approved returns
        const otherApprovedReturns = await Return.find({
          sale_id: returnRecord.sale_id,
          status: 'approved',
          _id: { $ne: id }
        });
        
        if (otherApprovedReturns.length === 0) {
          sale.status = 'completed';
          await sale.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Return ${status} successfully`,
      return: returnRecord,
      previous_status: previousStatus
    });
  } catch (err) {
    console.error('Update return status error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

exports.verifyStockUpdate = async (req, res) => {
  try {
    const { product_id } = req.params;
    
    const product = await Products.findById(product_id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }
    
    // Calculate expected stock based on sales and returns
    const sales = await Sale.find({ 
      'items.product_id': product_id,
      status: { $in: ['completed', 'partially_returned'] }
    });
    
    const returns = await Return.find({ 
      product_id,
      status: 'approved'  // Only count approved returns
    });
    
    let soldQuantity = 0;
    sales.forEach(sale => {
      const saleItem = sale.items.find(item => item.product_id.toString() === product_id.toString());
      if (saleItem) {
        soldQuantity += saleItem.quantity;
      }
    });
    
    let returnedQuantity = 0;
    returns.forEach(returnItem => {
      returnedQuantity += returnItem.quantity;
    });
    
    // Assuming initial stock was the stock before any sales
    // Current stock = Initial stock - Sold + Returned
    // So Initial stock = Current stock + Sold - Returned
    const calculatedInitialStock = product.available_quantity + soldQuantity - returnedQuantity;
    
    // Get all return transactions for verification
    const returnTransactions = await Return.find({ product_id })
      .populate('sale_id', 'invoice_no')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.status(200).json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        current_stock: product.available_quantity,
        sold_quantity: soldQuantity,
        returned_quantity: returnedQuantity,
        calculated_initial_stock: calculatedInitialStock,
        stock_updated_correctly: calculatedInitialStock >= 0,
        return_transactions: returnTransactions.map(t => ({
          id: t._id,
          quantity: t.quantity,
          reason: t.reason,
          status: t.status,
          sale_invoice: t.sale_id?.invoice_no,
          date: t.createdAt
        }))
      }
    });
  } catch (err) {
    console.error('Verify stock update error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get return statistics
exports.getReturnStatistics = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [todayReturns, weekReturns, monthReturns, allReturns] = await Promise.all([
      Return.find({ 
        admin_id: adminId,
        createdAt: { $gte: today }
      }),
      Return.find({ 
        admin_id: adminId,
        createdAt: { $gte: weekAgo }
      }),
      Return.find({ 
        admin_id: adminId,
        createdAt: { $gte: monthAgo }
      }),
      Return.find({ admin_id: adminId })
    ]);

    const calculateStats = (returns) => ({
      count: returns.length,
      quantity: returns.reduce((sum, r) => sum + r.quantity, 0),
      amount: returns.reduce((sum, r) => sum + (r.refund_amount || 0), 0)
    });

    res.status(200).json({
      success: true,
      statistics: {
        today: calculateStats(todayReturns),
        this_week: calculateStats(weekReturns),
        this_month: calculateStats(monthReturns),
        all_time: calculateStats(allReturns),
        by_status: {
          approved: allReturns.filter(r => r.status === 'approved').length,
          pending: allReturns.filter(r => r.status === 'pending').length,
          rejected: allReturns.filter(r => r.status === 'rejected').length
        }
      }
    });
  } catch (err) {
    console.error('Get return statistics error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};