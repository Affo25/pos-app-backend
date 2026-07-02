const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const {
  buildFullPermissions,
  getAllPageKeys,
} = require("../config/permissionCatalog");

let bootstrapStarted = false;
let bootstrapDone = false;

const getDefaultAdminCredentials = () => ({
  email: process.env.DEFAULT_ADMIN_EMAIL || "admin@admin.com",
  password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
  name: process.env.DEFAULT_ADMIN_NAME || "Super Admin",
});

async function ensureSuperAdminRole() {
  const fullPermissions = buildFullPermissions();

  let role = await Role.findOne({ key: "super_admin" });
  if (role) {
    role.name = "Super Admin";
    role.description = "Full system access to every module";
    role.isSystem = true;
    role.permissions = fullPermissions;
    await role.save();
    return role;
  }

  role = await Role.create({
    name: "Super Admin",
    key: "super_admin",
    description: "Full system access to every module",
    isSystem: true,
    permissions: fullPermissions,
  });

  return role;
}

async function ensureDefaultSuperAdminUser(superAdminRole) {
  const { email, password, name } = getDefaultAdminCredentials();
  const fullPermissions = buildFullPermissions();
  const allowedPages = getAllPageKeys();

  const existingSuperAdmin = await User.findOne({ user_type: "superAdmin" });
  if (existingSuperAdmin) {
    let changed = false;

    if (!existingSuperAdmin.role_id) {
      existingSuperAdmin.role_id = superAdminRole._id;
      changed = true;
    }

    if (!existingSuperAdmin.permissions?.length) {
      existingSuperAdmin.permissions = fullPermissions;
      changed = true;
    }

    if (!existingSuperAdmin.allowed_pages?.length) {
      existingSuperAdmin.allowed_pages = allowedPages;
      changed = true;
    }

    if (changed) {
      await existingSuperAdmin.save();
    }

    return { created: false, email: existingSuperAdmin.email };
  }

  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return { created: false, email: null };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    password: hashedPassword,
    plain_password: password,
    user_type: "superAdmin",
    role_id: superAdminRole._id,
    allowed_pages: allowedPages,
    permissions: fullPermissions,
    status: "active",
    license_status: "active",
    subscription_status: "active",
  });

  return { created: true, email, password };
}

async function runBootstrap() {
  if (bootstrapDone) return;
  if (bootstrapStarted) return;

  bootstrapStarted = true;

  try {
    const superAdminRole = await ensureSuperAdminRole();
    const result = await ensureDefaultSuperAdminUser(superAdminRole);

    if (result.created) {
      console.log("✅ Default Super Admin user created");
      console.log(`   Email:    ${result.email}`);
      console.log(`   Password: ${result.password}`);
      console.log("   Role:     Super Admin (full access)");
    } else if (result.email) {
      console.log(`✅ Super Admin user ready (${result.email})`);
    }

    bootstrapDone = true;
  } catch (error) {
    bootstrapStarted = false;
    console.error("❌ Bootstrap failed:", error.message);
  }
}

module.exports = { runBootstrap, getDefaultAdminCredentials };
