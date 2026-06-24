// seedAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// First, let's check if we're in the right directory
console.log('📂 Current directory:', __dirname);
console.log('📁 Parent directory:', path.dirname(__dirname));
console.log('🔍 Loading .env from:', path.join(__dirname, '..', '.env'));

// Check if .env file exists
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
} else {
  console.log('❌ .env file NOT found at:', envPath);
  console.log('🔍 Looking for .env in other locations...');
  fs.readdirSync(path.dirname(__dirname)).forEach(file => {
    console.log('  -', file);
  });
}

// Try different possible paths for User model
let User;
try {
  User = require('./models/User');
  console.log('✅ User model found at ./models/User');
} catch (err) {
  try {
    User = require(path.join(__dirname, '..', 'models', 'User'));
    console.log('✅ User model found at ../models/User');
  } catch (err2) {
    console.error('❌ Could not find User model:', err2.message);

    // Create a simple User model
    console.log('🔄 Creating temporary User model...');
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      password: String,
      plain_password: String,
      user_type: String,
      allowed_pages: [String],
      status: { type: String, default: 'active' },
      permissions: Array,
      client_id: mongoose.Schema.Types.ObjectId,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    User = mongoose.model('User', userSchema);
  }
}

const allowedPages = [
  'users', 'branchProfiles', 'departments', 'subjects',
  'accountheads', 'feeheads', 'classTypes',
   'notices',
  'news', 'nonAcademics', 'events'
];

const seedAdmin = async () => {
  try {
    console.log('\n🔗 Connecting to MongoDB...');

    // Use direct MongoDB URI (no .env dependency)
    const mongoURI = process.env.MONGO_URI ||
      'mongodb://localhost:27017/inventory_db' ||
      'mongodb://127.0.0.1:27017/inventory_db';

    console.log('📡 Using MongoDB URI:', mongoURI);
    console.log('💡 If connection fails, please check:');
    console.log('   1. MongoDB service is running (net start MongoDB)');
    console.log('   2. MongoDB is installed');
    console.log('   3. Port 27017 is not blocked');

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.db.databaseName);

    // Check if admin already exists
    console.log('\n🔍 Checking if admin user exists...');
    const existingAdmin = await User.findOne({ email: 'admin@admin.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 User Type:', existingAdmin.user_type);
      console.log('📛 Name:', existingAdmin.name);
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
      return;
    }

    // Create super admin
    console.log('\n👨‍💼 Creating super admin user...');
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@admin.com',
      password: hashedPassword,
      plain_password: password,
      user_type: 'superAdmin',
      allowed_pages: allowedPages,
      status: 'active',
      permissions: [],
      client_id: null,
    });

    await adminUser.save();

    console.log('\n🎉 SUPER ADMIN CREATED SUCCESSFULLY!');
    console.log('========================================');
    console.log('📧 Email:    admin@admin.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Name:     Super Admin');
    console.log('🎯 Type:     superAdmin');
    console.log('✅ Status:   active');
    console.log('========================================\n');

    // Verify the user was saved
    const verifyUser = await User.findOne({ email: 'admin@admin.com' });
    console.log('✅ Verification:', verifyUser ? 'User found in database' : 'User not found');

    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');

  } catch (error) {
    console.error('\n❌ ERROR DETAILS:');
    console.error('Message:', error.message);

    if (error.name === 'MongoServerSelectionError' || error.message.includes('connect')) {
      console.error('\n🔧 TROUBLESHOOTING STEPS:');
      console.error('1. Open Command Prompt as Administrator');
      console.error('2. Run: net start MongoDB');
      console.error('3. If MongoDB is not installed, install it from: https://www.mongodb.com/try/download/community');
      console.error('4. Try with 127.0.0.1: mongodb://127.0.0.1:27017/school-management');
    }

    process.exit(1);
  }
};

console.log('🚀 Starting seed script...');
seedAdmin();