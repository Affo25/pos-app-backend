// dashboardController.js

const Sale = require('../models/Sale');
const Products = require('../models/Products');
const Category = require('../models/Category');
const Customer = require('../models/Customer');
const User = require('../models/User');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');

// Helper function to get date ranges
const getDateRanges = () => {
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  
  return { 
    startOfToday, 
    startOfMonth, 
    endOfMonth,
    lastMonth,
    lastMonthEnd
  };
};

// Calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Main Dashboard API
exports.getDashboardData = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const { startDate: qStart, endDate: qEnd } = req.query;
    const { startOfToday, startOfMonth, endOfMonth, lastMonth, lastMonthEnd } = getDateRanges();

    let rangeStart = new Date(startOfMonth);
    let rangeEnd = new Date(endOfMonth);
    let prevRangeStart = new Date(lastMonth);
    let prevRangeEnd = new Date(lastMonthEnd);
    let rangeLabel = 'This month';
    let isCustomRange = false;

    if (qStart && qEnd) {
      isCustomRange = true;
      rangeStart = new Date(qStart);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(qEnd);
      rangeEnd.setHours(23, 59, 59, 999);
      const durationMs = rangeEnd.getTime() - rangeStart.getTime();
      prevRangeEnd = new Date(rangeStart.getTime() - 1);
      prevRangeStart = new Date(prevRangeEnd.getTime() - durationMs);
      rangeLabel = 'Selected period';
    }

    // Parallel queries for better performance
    const [
      todaySales,
      monthSales,
      lastMonthSales,
      categories,
      expiredMedicines,
      totalUsers,
      lastMonthUsers,
      totalProducts,
      purchasesData,
      suppliersData,
      weeklySales,
      recentSales
    ] = await Promise.all([
      // Today's Sales
      Sale.aggregate([
        {
          $match: {
            admin_id: adminId,
            status: 'completed',
            sale_date: { $gte: startOfToday }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$net_amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Period Sales (calendar month or custom range)
      Sale.aggregate([
        {
          $match: {
            admin_id: adminId,
            status: 'completed',
            sale_date: { $gte: rangeStart, $lte: rangeEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$net_amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Previous period sales (for % change)
      Sale.aggregate([
        {
          $match: {
            admin_id: adminId,
            status: 'completed',
            sale_date: { $gte: prevRangeStart, $lte: prevRangeEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$net_amount' }
          }
        }
      ]),
      
      // Available Categories
      Category.find({ admin_id: adminId }).countDocuments(),
      
      // Expired Medicines
      Products.countDocuments({
        admin_id: adminId,
        expiry_date: { $lt: new Date() }
      }),
      
      // System Users (active users)
      User.countDocuments({
        admin_id: adminId,
        status: 'active'
      }),
      
      // Last Month Users
      User.countDocuments({
        admin_id: adminId,
        status: 'active',
        createdAt: { $gte: lastMonth, $lte: lastMonthEnd }
      }),
      
      // Total Products
      Products.countDocuments({ admin_id: adminId }),
      
      PurchaseOrder.aggregate([
        {
          $match: {
            admin_id: adminId,
            order_date: { $gte: rangeStart, $lte: rangeEnd },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $addFields: {
            orderTotal: {
              $sum: {
                $map: {
                  input: '$items',
                  as: 'it',
                  in: { $multiply: ['$$it.quantity', '$$it.price'] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$orderTotal' },
          },
        },
      ]),

      Supplier.countDocuments({ admin_id: adminId }),
      
      // Daily sales within selected period (for chart)
      Sale.aggregate([
        {
          $match: {
            admin_id: adminId,
            status: 'completed',
            sale_date: { $gte: rangeStart, $lte: rangeEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$sale_date' } },
            sales: { $sum: '$net_amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Recent Sales List (within period)
      Sale.find({
        admin_id: adminId,
        status: 'completed',
        sale_date: { $gte: rangeStart, $lte: rangeEnd },
      })
        .sort({ sale_date: -1 })
        .limit(50)
        .populate('created_by', 'name email')
        .populate('customer_id', 'name email')
        .lean()
    ]);
    
    // Calculate percentages
    const currentPeriodSales = monthSales[0]?.total || 0;
    const previousPeriodSales = lastMonthSales[0]?.total || 0;
    const salesPercentageChange = calculatePercentageChange(currentPeriodSales, previousPeriodSales);
    
    const currentMonthCategories = categories || 0;
    const previousMonthCategories = await Category.countDocuments({
      admin_id: adminId,
      createdAt: { $gte: lastMonth, $lte: lastMonthEnd }
    });
    const categoriesPercentageChange = calculatePercentageChange(currentMonthCategories, previousMonthCategories);
    
    const currentExpired = expiredMedicines || 0;
    const previousExpired = await Products.countDocuments({
      admin_id: adminId,
      expiry_date: { 
        $gte: lastMonth, 
        $lte: lastMonthEnd,
        $lt: new Date()
      }
    });
    const expiredPercentageChange = calculatePercentageChange(currentExpired, previousExpired);
    
    const currentUsers = totalUsers || 0;
    const usersPercentageChange = calculatePercentageChange(currentUsers, lastMonthUsers || 0);
    
    const supplierCount = typeof suppliersData === 'number' ? suppliersData : 0;

    // Prepare Graph Report Data
    const graphReport = {
      total: currentPeriodSales,
      purchases: purchasesData[0]?.total || 0,
      suppliers: supplierCount,
      sales: currentPeriodSales,
      noSales: Math.max(0, (totalProducts || 0) - (recentSales.length || 0))
    };

    const weeklySalesData = (weeklySales || []).map((d) => ({
      day: d._id,
      sales: d.sales || 0,
      count: d.count || 0,
    }));
    
    // Format Recent Sales
    const formattedRecentSales = recentSales.map(sale => ({
      id: sale._id,
      customerName: sale.customer_name || (sale.customer_id?.name || 'Walk-in Customer'),
      medicine: sale.items.map(item => item.product_name).join(', '),
      userEmail: sale.created_by?.email || 'N/A',
      quantity: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: sale.net_amount,
      date: sale.sale_date,
      shotBy: sale.created_by?.name || 'System',
      invoiceNo: sale.invoice_no
    }));
    
    // Response as per dashboard requirements
    const dashboardData = {
      welcome: {
        message: "Welcome Code Astro!",
        greeting: getGreeting()
      },
      
      // Main Stats Cards
      meta: {
        isCustomRange,
        rangeLabel,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
      },

      stats: {
        todaysSales: {
          value: currentPeriodSales,
          formattedValue: formatCurrency(currentPeriodSales),
          percentageChange: salesPercentageChange,
          trend: salesPercentageChange >= 0 ? 'up' : 'down',
          label: rangeLabel,
        },
        literalToday: {
          value: todaySales[0]?.total || 0,
          formattedValue: formatCurrency(todaySales[0]?.total || 0),
          label: 'Today',
        },
        availableCategories: {
          value: totalProducts ? `${((categories / totalProducts) * 100).toFixed(1)}%` : '0%',
          rawValue: categories,
          percentageChange: categoriesPercentageChange,
          trend: categoriesPercentageChange >= 0 ? 'up' : 'down',
          label: "This Month"
        },
        expiredMedicines: {
          value: totalProducts ? `${((expiredMedicines / totalProducts) * 100).toFixed(2)}%` : '0%',
          rawValue: expiredMedicines,
          percentageChange: expiredPercentageChange,
          trend: expiredPercentageChange >= 0 ? 'up' : 'down',
          label: "This Month"
        },
        systemUsers: {
          value: formatNumber(totalUsers),
          rawValue: totalUsers,
          percentageChange: usersPercentageChange,
          trend: usersPercentageChange >= 0 ? 'up' : 'down',
          label: "This Month"
        }
      },
      
      // Graph Report Data
      graphReport: {
        total: formatCurrency(graphReport.total),
        purchases: formatCurrency(graphReport.purchases),
        suppliers: graphReport.suppliers,
        sales: formatCurrency(graphReport.sales),
        noSales: graphReport.noSales,
        chartData: {
          labels: ['Total', 'Purchases', 'Suppliers', 'Sales', 'No Sales'],
          values: [graphReport.total, graphReport.purchases, graphReport.suppliers, graphReport.sales, graphReport.noSales],
          colors: ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336']
        }
      },
      
      // Total Sales Overview (Weekly)
      salesOverview: {
        weekly: weeklySalesData,
        chartData: {
          labels: weeklySalesData.map(d => d.day),
          sales: weeklySalesData.map(d => d.sales),
          orders: weeklySalesData.map(d => d.count)
        },
        summary: {
          totalWeekSales: weeklySalesData.reduce((sum, d) => sum + d.sales, 0),
          averageDailySales: weeklySalesData.length
            ? weeklySalesData.reduce((sum, d) => sum + d.sales, 0) / weeklySalesData.length
            : 0,
          bestDay: weeklySalesData.length
            ? weeklySalesData.reduce((best, current) =>
                current.sales > best.sales ? current : best,
                weeklySalesData[0],
              )
            : { day: '—', sales: 0 },
        }
      },
      
      // Recent Sales List
      recentSales: {
        headers: ['Name', 'Medicine', 'User Email', 'Quantity', 'Total Price', 'Date', 'Shot By'],
        data: formattedRecentSales,
        total: formattedRecentSales.length,
        lastUpdated: new Date()
      },
      
      // Additional Analytics for Dashboard
      additionalStats: {
        totalProducts: totalProducts,
        totalCustomers: await Customer.countDocuments({ admin_id: adminId }),
        pendingOrders: await PurchaseOrder.countDocuments({
          admin_id: adminId,
          status: 'pending',
        }),
        lowStockItems: await Products.countDocuments({
          admin_id: adminId,
          $expr: { $lte: ['$available_quantity', '$min_stock_level'] }
        })
      }
    };
    
    res.status(200).json({
      success: true,
      data: dashboardData
    });
    
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// Get Sales Overview with filters
exports.getSalesOverview = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const { period = 'week', startDate, endDate } = req.query;
    
    let dateFilter = {};
    let groupBy = {};
    
    if (startDate && endDate) {
      dateFilter = {
        sale_date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$sale_date' } };
    } else {
      switch (period) {
        case 'today':
          dateFilter = {
            sale_date: { $gte: new Date().setHours(0, 0, 0, 0) }
          };
          groupBy = { $hour: '$sale_date' };
          break;
        case 'week':
          dateFilter = {
            sale_date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          };
          groupBy = { $dayOfWeek: '$sale_date' };
          break;
        case 'month':
          dateFilter = {
            sale_date: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          };
          groupBy = { $dayOfMonth: '$sale_date' };
          break;
        case 'year':
          dateFilter = {
            sale_date: {
              $gte: new Date(new Date().getFullYear(), 0, 1)
            }
          };
          groupBy = { $month: '$sale_date' };
          break;
      }
    }
    
    const salesData = await Sale.aggregate([
      {
        $match: {
          admin_id: adminId,
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: groupBy,
          totalSales: { $sum: '$net_amount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$net_amount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      period,
      data: salesData,
      summary: {
        totalRevenue: salesData.reduce((sum, d) => sum + d.totalSales, 0),
        totalOrders: salesData.reduce((sum, d) => sum + d.orderCount, 0),
        averageOrderValue: salesData.reduce((sum, d) => sum + d.averageOrderValue, 0) / salesData.length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Top Selling Products
exports.getTopProducts = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const { limit = 10, startDate, endDate } = req.query;

    const match = { admin_id: adminId, status: 'completed' };
    if (startDate && endDate) {
      const rs = new Date(startDate);
      rs.setHours(0, 0, 0, 0);
      const re = new Date(endDate);
      re.setHours(23, 59, 59, 999);
      match.sale_date = { $gte: rs, $lte: re };
    }

    const topProducts = await Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product_id',
          name: { $first: '$items.product_name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.line_total' },
          numberOfSales: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    res.status(200).json({
      success: true,
      products: topProducts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get Recent Activities
exports.getRecentActivities = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const { limit = 10 } = req.query;
    
    const [recentSales, recentProducts, recentCustomers] = await Promise.all([
      Sale.find({ admin_id: adminId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('created_by', 'name'),
      Products.find({ admin_id: adminId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit)),
      Customer.find({ admin_id: adminId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
    ]);
    
    const activities = [
      ...recentSales.map(sale => ({
        type: 'sale',
        id: sale._id,
        title: `New Sale #${sale.invoice_no}`,
        amount: sale.net_amount,
        customer: sale.customer_name,
        time: sale.createdAt,
        user: sale.created_by?.name
      })),
      ...recentProducts.map(product => ({
        type: 'product',
        id: product._id,
        title: `New Product Added: ${product.name}`,
        quantity: product.available_quantity,
        price: product.unit_price,
        time: product.createdAt
      })),
      ...recentCustomers.map(customer => ({
        type: 'customer',
        id: customer._id,
        title: `New Customer: ${customer.name}`,
        email: customer.email,
        time: customer.createdAt
      }))
    ];
    
    // Sort by time and limit
    activities.sort((a, b) => b.time - a.time);
    
    res.status(200).json({
      success: true,
      activities: activities.slice(0, parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Helper Functions
function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
  }).format(n);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}