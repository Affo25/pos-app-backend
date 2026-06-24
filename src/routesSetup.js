const path = require('path');
const express = require('express');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');

/**
 * Attaches CORS, body parsers, uploads, and all /api routes to `app`.
 * Loaded after server.js calls listen() so Railway can pass HTTP healthchecks while models load.
 */
module.exports = function setupRoutes(app) {
  const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
  const supplierRoutes = require('./routes/supplierRoutes');
  const saleRoutes = require('./routes/saleRoutes');
  const returnRoutes = require('./routes/returnRoutes');
  const customerRoutes = require('./routes/customerRoutes');
  const subCategoryRoutes = require('./routes/subCategoryRoutes');
  const categoryRoutes = require('./routes/categoryRoutes');
  const productsRoutes = require('./routes/productsRoutes');
  const analyticsRoutes = require('./routes/AnalyticsRoutes');
  const branchProfileRoutes = require('./routes/branchProfileRoutes');
  const userRoutes = require('./routes/userRoutes');

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/ping', (req, res) => {
    res.status(200).json({ ok: true, service: 'inventory-api' });
  });

  const fs = require('fs');
  const { getUploadsRoot, ensureDir } = require('./config/uploadsPath');
  const uploadsDir = ensureDir(getUploadsRoot());

  app.use('/uploads', express.static(uploadsDir));
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/branchProfiles', branchProfileRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/categorys', categoryRoutes);
  app.use('/api/subCategorys', subCategoryRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/purchaseOrders', purchaseOrderRoutes);
  app.use('/api/purchaseorders', purchaseOrderRoutes);

  const printRoutes = require('./routes/printRoutes');
  app.use('/api/print', printRoutes);

  const publicPrintRoutes = require('./routes/publicPrintRoutes');
  app.use('/api/public/print', publicPrintRoutes);

  const settingsRoutes = require('./routes/settingsRoutes');
  app.use('/api/settings', settingsRoutes);

  const paymentRoutes = require('./routes/paymentRoutes');
  app.use('/api/payments', paymentRoutes);
};
