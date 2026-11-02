const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, returnController.createReturn);
router.get('/export-excel', protect, returnController.exportReturnsToExcel);
router.get('/', protect, returnController.getReturns);

module.exports = router;
