/**
 * Inserts 300 demo product documents for the first admin user.
 * Requires MONGO_URI (or MONGODB_URI) in backend/.env
 *
 * Usage: node src/seedProducts300.js
 *    or: npm run seed:products300
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const Products = require('./models/Products');

const COUNT = Number(process.env.SEED_PRODUCT_COUNT || 300);

const MED_NAMES = [
  'Paracetamol',
  'Amoxicillin',
  'Ibuprofen',
  'Azithromycin',
  'Omeprazole',
  'Metformin',
  'Amlodipine',
  'Losartan',
  'Cetirizine',
  'Salbutamol',
  'Diclofenac',
  'Ranitidine',
  'Vitamin D3',
  'Calcium Carbonate',
  'Folic Acid',
];

const SUPPLIERS = ['ABC Pharma', 'City Pharma', 'MedSupply Co', 'HealthLine', 'Prime Distributors', 'Global Meds'];
const MANUFACTURERS = ['Novartis', 'Abbott', 'Pfizer', 'GSK', 'Cipla', 'Sun Pharma', 'Dr. Reddy', 'Mylan'];

async function seedProducts300() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('Set MONGO_URI (or MONGODB_URI) in backend/.env');
  }

  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB did not connect (check URI and network)');
  }

  const adminQuery = process.env.SEED_ADMIN_EMAIL
    ? { user_type: 'admin', email: process.env.SEED_ADMIN_EMAIL }
    : { user_type: 'admin' };
  const admin = await User.findOne(adminQuery).lean();
  if (!admin) {
    throw new Error(
      process.env.SEED_ADMIN_EMAIL
        ? `No admin user with email ${process.env.SEED_ADMIN_EMAIL}`
        : 'No admin user found — create an admin first (e.g. seedAdmin)'
    );
  }

  const categoryNames = ['tablet', 'syrup', 'injection', 'ointment', 'other'];
  const categoryIds = [];
  for (const name of categoryNames) {
    let cat = await Category.findOne({
      admin_id: admin._id,
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (!cat) {
      cat = await Category.create({
        name,
        description: '',
        admin_id: admin._id,
        created_by: admin._id,
      });
    }
    categoryIds.push(cat._id);
  }

  const baseTs = Date.now();
  const today = new Date();
  const docs = [];

  for (let i = 1; i <= COUNT; i += 1) {
    const qty = 10 + (i * 3) % 90;
    const price = 20 + (i % 200) + (i % 17) * 3;
    const expiry = new Date(today.getFullYear() + 1 + (i % 2), (i * 3) % 12, (i % 28) + 1);
    const nameBase = MED_NAMES[(i - 1) % MED_NAMES.length];
    const total_value = price * qty;

    docs.push({
      name: `${nameBase} ${i}`,
      sku: `SKU-${baseTs}-${i}`,
      batch_number: `BATCH-${1000 + (i % 900)}`,
      expiry_date: expiry,
      available_quantity: qty,
      minimum_stock_alert: 5 + (i % 15),
      unit_price: price,
      total_value,
      supplier_name: SUPPLIERS[(i - 1) % SUPPLIERS.length],
      manufacturer: MANUFACTURERS[(i - 1) % MANUFACTURERS.length],
      category: categoryIds[i % categoryIds.length],
      rack_location: `RACK-${((i - 1) % 12) + 1}`,
      discount: i % 7 === 0 ? 5 : 0,
      gst: [0, 5, 12, 18][i % 4],
      status: i % 41 === 0 ? 'inactive' : 'active',
      manufacturer_license_no: `LIC-${20000 + i}`,
      manufacturer_registration_no: `REG-${30000 + i}`,
      medicine_size: i % 3 === 0 ? `${50 + (i % 10) * 10}ml` : `${((i % 8) + 1) * 50}mg`,
      admin_id: admin._id,
      created_by: admin._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const result = await Products.collection.insertMany(docs, { ordered: true });
  console.log(`Inserted ${result.insertedCount} products for admin ${admin.email} (${admin._id})`);
  await mongoose.connection.close();
}

seedProducts300().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.connection.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
