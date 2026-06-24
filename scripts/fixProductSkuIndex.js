/**
 * One-time fix: replaces a non-sparse unique index on `sku` with a sparse unique index.
 * Without sparse: MongoDB only allows one document with sku null/missing (E11000 duplicate key).
 *
 * Run from backend folder: node scripts/fixProductSkuIndex.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Products = require('../src/models/Products');

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory_db';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const col = Products.collection;

  try {
    await col.dropIndex('sku_1');
    console.log('Dropped index: sku_1');
  } catch (e) {
    console.log('Note (drop sku_1):', e.message);
  }

  await Products.syncIndexes();
  console.log('Indexes synced. Expected: sku_1 unique + sparse.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
