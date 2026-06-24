const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/analyticsController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/dashboard', dashboardController.getDashboardData);
router.get('/sales-overview', dashboardController.getSalesOverview);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/recent-activities', dashboardController.getRecentActivities);

module.exports = router;
