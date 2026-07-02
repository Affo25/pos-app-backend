 const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    password: { type: String, required: true },

    plain_password: { type: String },

    user_type: {
      type: String,
      enum: ["superAdmin", "admin", "user"],
      default: "user",
    },

    allowed_pages: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    resetOtp: String,
    resetOtpExpiry: Date,
    resetOtpVerified: {
      type: Boolean,
      default: false,
    },
    resetOtpVerifiedAt: Date,

    permissions: {
      type: [
        {
          key: String,
          component: String,
          add: { type: Boolean, default: false },
          edit: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
          view: { type: Boolean, default: false },
        },
      ],
      default: [],
    },

    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },

    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =========================
    // 🔐 SaaS Subscription Fields
    // =========================

    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },

    subscription_status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },

    subscription_start: {
      type: Date,
    },

    subscription_end: {
      type: Date,
    },

    // =========================
    // 🔑 License System
    // =========================

    license_key: {
      type: String,
      unique: true,
    },

    license_status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },

    // =========================
    // 🛡 Security
    // =========================

    is_blocked: {
      type: Boolean,
      default: false,
    },

    // =========================
    // 📱 Device Control (Optional)
    // =========================

    allowed_devices: {
      type: Number,
      default: 1,
    },

    last_login_ip: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Hide password
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.plain_password;
  return user;
};

module.exports = mongoose.model("User", userSchema);