require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const Products = require('./models/Products');

async function seedProducts() {
  await connectDB();

  const admin = await User.findOne({ user_type: 'admin' }).lean();
  if (!admin) {
    throw new Error('No admin user found');
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

  const categories = categoryIds;
  const today = new Date();
  const docs = [];

  for (let i = 1; i <= 30; i += 1) {
    const qty = 10 + (i * 3) % 90;
    const price = 20 + i * 7;
    const expiry = new Date(today.getFullYear() + 1 + (i % 2), (i * 3) % 12, (i % 28) + 1);

    docs.push({
      name: `Demo Product ${i}`,
      batch_number: `BATCH-${1000 + i}`,
      expiry_date: expiry,
      available_quantity: qty,
      minimum_stock_alert: 5,
      unit_price: price,
      supplier_name: `Supplier ${((i - 1) % 6) + 1}`,
      manufacturer: `Manufacturer ${((i - 1) % 5) + 1}`,
      category: categories[i % categories.length],
      rack_location: `R-${((i - 1) % 10) + 1}`,
      discount: 0,
      gst: 5,
      status: 'active',
      manufacturer_license_no: `LIC-${2000 + i}`,
      manufacturer_registration_no: `REG-${3000 + i}`,
      medicine_size: `${((i % 5) + 1) * 100}mg`,
      admin_id: admin._id,
      created_by: admin._id,
    });
  }

  const docsWithSku = docs.map((doc, index) => ({
    ...doc,
    sku: `SKU-${Date.now()}-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await Products.collection.insertMany(docsWithSku, { ordered: true });
  console.log(`Inserted ${result.insertedCount} products for admin ${admin.email}`);
  await mongoose.connection.close();
}

seedProducts().catch(async (error) => {
  console.error(error.message);
  try {
    await mongoose.connection.close();
  } catch (e) {
    // ignore close error
  }
  process.exit(1);
});
