const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('./models/User');

const allowedPages = [
  'users', 'branchProfiles', 'departments', 'subjects',
  'accountheads', 'feeheads', 'classTypes',
   'notices',
  'news', 'nonAcademics', 'events'
];

const seedSecondaryAdmin = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory_db';
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

    const existingAdmin = await User.findOne({ email: 'secondaryadmin@admin.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      await mongoose.disconnect();
      return;
    }

    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = new User({
      name: 'Secondary Admin',
      email: 'secondaryadmin@admin.com',
      password: hashedPassword,
      plain_password: password,
      user_type: 'admin',
      allowed_pages: allowedPages,
      status: 'active',
      permissions: [],
    });

    await adminUser.save();
    console.log('\n🎉 SECONDARY ADMIN CREATED SUCCESSFULLY!');
    console.log('📧 Email: secondaryadmin@admin.com');
    console.log('🔑 Password: admin123');

    await mongoose.disconnect();
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
};

seedSecondaryAdmin();
