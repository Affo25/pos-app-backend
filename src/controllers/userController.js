const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const transporter = require("../config/emailService");
const { normalizePhone, isValidPhone } = require("../utils/phoneValidation");
const { sendUserCredentialsEmail, buildEmailPreview } = require("../services/emailService");
const {
  sendWelcomeWhatsApp,
  buildWhatsAppPreview,
  isWhatsAppConfigured,
} = require("../services/whatsappService");

async function assertCanManageUser(loggedInUser, targetUserId) {
  const target = await User.findById(targetUserId);
  if (!target) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  if (loggedInUser.user_type === "superAdmin") {
    return target;
  }
  if (
    loggedInUser.user_type === "admin" &&
    target.admin_id &&
    String(target.admin_id) === String(loggedInUser._id)
  ) {
    return target;
  }
  const err = new Error("Unauthorized access");
  err.status = 403;
  throw err;
}

function applyPhoneAddressFields(data, body) {
  if (body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (phone && !isValidPhone(phone)) {
      const err = new Error("Invalid phone. Use format +923247890891");
      err.status = 400;
      throw err;
    }
    data.phone = phone;
  }
  if (body.address !== undefined) {
    data.address = String(body.address || "").trim();
  }
}

// Helper function to generate unique license key
const generateLicenseKey = () => {
  return 'LIC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

const OTP_EXPIRY_MINUTES = 10;

const generateResetOtp = () => {
  return String(crypto.randomInt(100000, 1000000));
};

const buildOtpHash = (otp) => {
  const secret = process.env.JWT_SECRET || "inventory-reset-otp-secret";
  return crypto.createHmac("sha256", secret).update(String(otp)).digest("hex");
};

const buildResetOtpEmailTemplate = ({ name, otp }) => {
  const appName = "Aid+ Inventory";
  const supportEmail = process.env.SMTP_USER || "support@aidplus.app";
  const year = new Date().getFullYear();

  return `
    <div style="margin:0;padding:0;background:#f3f6fb;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7edf6;box-shadow:0 10px 30px rgba(16,24,40,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#2d3142 0%,#4f5d75 100%);padding:22px 28px;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.2px;">${appName}</h1>
                  <p style="margin:6px 0 0;color:#dbe3f0;font-size:13px;">Password Reset Verification</p>
                </td>
              </tr>

              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 10px;color:#0f172a;font-size:15px;">Hi ${name || "there"},</p>
                  <p style="margin:0 0 18px;color:#475467;font-size:14px;line-height:1.7;">
                    Use the one-time password below to reset your account password. This code is valid for
                    <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
                  </p>

                  <div style="margin:0 0 18px;padding:16px;border:1px dashed #c7d7ee;border-radius:12px;background:#f8fbff;text-align:center;">
                    <p style="margin:0 0 8px;color:#667085;font-size:12px;letter-spacing:0.4px;text-transform:uppercase;">Your OTP Code</p>
                    <p style="margin:0;color:#111827;font-size:34px;font-weight:800;letter-spacing:8px;">${otp}</p>
                  </div>

                  <p style="margin:0 0 16px;color:#667085;font-size:13px;line-height:1.6;">
                    If you did not request a password reset, you can safely ignore this email. Your account remains secure.
                  </p>

                  <div style="padding-top:14px;border-top:1px solid #eef2f8;">
                    <p style="margin:0;color:#98a2b3;font-size:12px;line-height:1.6;">
                      Need help? Contact us at
                      <a href="mailto:${supportEmail}" style="color:#2d3142;text-decoration:none;font-weight:600;">${supportEmail}</a>
                    </p>
                  </div>
                </td>
              </tr>
            </table>

            <p style="margin:14px 0 0;color:#98a2b3;font-size:11px;">
              © ${year} ${appName}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({ message: "Account is blocked. Please contact support." });
    }

    // Check if license is active
    if (user.license_status === "blocked") {
      return res.status(403).json({ message: "License is blocked. Please contact support." });
    }

    // Check subscription status
    if (user.subscription_status === "expired") {
      return res.status(403).json({ message: "Subscription has expired. Please renew." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Update last login IP
    user.last_login_ip = req.ip || req.connection.remoteAddress;
    await user.save();

    res.status(200).json({
      id: user._id,
      name: user.name,
      plain_password: user.plain_password,
      email: user.email,
      user_type: user.user_type,
      allowed_pages: user.allowed_pages,
      status: user.status,
      permissions: user.permissions,
      plan: user.plan,
      subscription_status: user.subscription_status,
      subscription_start: user.subscription_start,
      subscription_end: user.subscription_end,
      license_key: user.license_key,
      license_status: user.license_status,
      allowed_devices: user.allowed_devices,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendResetOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No user found with this email" });
    }

    const otp = generateResetOtp();
    const otpHash = buildOtpHash(otp);
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    user.resetOtp = otpHash;
    user.resetOtpExpiry = otpExpiry;
    user.resetOtpVerified = false;
    user.resetOtpVerifiedAt = null;
    await user.save();

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from: `"Inventory Management" <${from}>`,
      to: user.email,
      subject: "Your Password Reset OTP",
      text: `Your OTP for password reset is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: buildResetOtpEmailTemplate({ name: user.name, otp }),
    });

    return res.status(200).json({ message: "OTP sent to email successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.verifyResetOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const otp = String(req.body?.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No user found with this email" });
    }

    if (!user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ message: "OTP not requested. Please request OTP first." });
    }

    if (new Date() > new Date(user.resetOtpExpiry)) {
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    const otpHash = buildOtpHash(otp);
    if (otpHash !== user.resetOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.resetOtpVerified = true;
    user.resetOtpVerifiedAt = new Date();
    await user.save();

    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const newPassword = String(req.body?.newPassword || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Email, newPassword and confirmPassword are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No user found with this email" });
    }

    if (!user.resetOtpVerified) {
      return res.status(400).json({ message: "OTP is not verified" });
    }

    if (!user.resetOtpExpiry || new Date() > new Date(user.resetOtpExpiry)) {
      return res.status(400).json({ message: "OTP session expired. Please request OTP again." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.plain_password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.resetOtpVerified = false;
    user.resetOtpVerifiedAt = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const loggedInUser = req.user;

    let users;
    if (loggedInUser.user_type === "superAdmin") {
      users = await User.find().select("-password");
    }
    else if (loggedInUser.user_type === "admin") {
      users = await User.find({ admin_id: loggedInUser._id }).select("-password");
    }
    else {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      user_type,
      allowed_pages,
      status,
      permissions,
      plan,
      subscription_status,
      subscription_start,
      subscription_end,
      license_key,
      license_status,
      allowed_devices,
      phone,
      address,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Check if license key is provided and unique
    if (license_key) {
      const existingLicense = await User.findOne({ license_key });
      if (existingLicense) {
        return res.status(400).json({ message: "License key already in use" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashedPassword,
      plain_password: password,
      user_type: user_type || "user",
      allowed_pages: allowed_pages || [],
      status: status || "active",
      permissions: permissions || [],
      plan: plan || "free",
      subscription_status: subscription_status || "active",
      subscription_start: subscription_start || null,
      subscription_end: subscription_end || null,
      license_key: license_key || generateLicenseKey(),
      license_status: license_status || "active",
      allowed_devices: allowed_devices || 1,
      is_blocked: false,
    };

    applyPhoneAddressFields(userData, { phone, address });
    
    const creatingUser = req.user;
    if (creatingUser && creatingUser.user_type === "admin") {
      userData.admin_id = creatingUser._id;
    }

    const newUser = new User(userData);
    await newUser.save();

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      user_type: newUser.user_type,
      allowed_pages: newUser.allowed_pages,
      status: newUser.status,
      permissions: newUser.permissions,
      admin_id: newUser.admin_id,
      plan: newUser.plan,
      subscription_status: newUser.subscription_status,
      subscription_start: newUser.subscription_start,
      subscription_end: newUser.subscription_end,
      license_key: newUser.license_key,
      license_status: newUser.license_status,
      allowed_devices: newUser.allowed_devices,
      token: generateToken(newUser),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.plain_password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      user_type,
      allowed_pages,
      status,
      permissions,
      password,
      plan,
      subscription_status,
      subscription_start,
      subscription_end,
      license_key,
      license_status,
      allowed_devices,
      is_blocked,
      phone,
      address,
    } = req.body;

    const updateData = {
      name,
      email,
      user_type,
      allowed_pages,
      status,
      permissions,
      plan,
      subscription_status,
      subscription_start,
      subscription_end,
      license_status,
      allowed_devices,
      is_blocked,
    };

    applyPhoneAddressFields(updateData, { phone, address });

    // Handle license key update with uniqueness check
    if (license_key) {
      const existingUser = await User.findOne({ 
        license_key, 
        _id: { $ne: id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: "License key already in use" });
      }
      updateData.license_key = license_key;
    }

    // Handle password update
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
      updateData.plain_password = password;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserEmailPreview = async (req, res) => {
  try {
    await assertCanManageUser(req.user, req.params.id);
    const user = await User.findById(req.params.id)
      .select("name email plain_password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      _id: user._id,
      ...buildEmailPreview(user),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

exports.sendUserEmail = async (req, res) => {
  try {
    await assertCanManageUser(req.user, req.params.id);
    const user = await User.findById(req.params.id)
      .select("name email plain_password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.email) {
      return res.status(400).json({ message: "User has no email address" });
    }

    const info = await sendUserCredentialsEmail(user, {
      subject: req.body?.subject,
      text: req.body?.text,
    });

    res.status(200).json({
      message: "Email sent successfully",
      messageId: info.messageId,
      to: user.email,
    });
  } catch (error) {
    if (error.code === "SMTP_NOT_CONFIGURED" || error.code === "RESEND_NOT_CONFIGURED") {
      return res.status(503).json({ message: error.message });
    }
    res.status(error.status || 500).json({ message: error.message });
  }
};

exports.getUserWhatsAppPreview = async (req, res) => {
  try {
    await assertCanManageUser(req.user, req.params.id);
    const user = await User.findById(req.params.id)
      .select("name email phone plain_password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      _id: user._id,
      ...buildWhatsAppPreview(user),
      whatsappConfigured: isWhatsAppConfigured(),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

exports.sendUserWhatsApp = async (req, res) => {
  try {
    await assertCanManageUser(req.user, req.params.id);
    const user = await User.findById(req.params.id)
      .select("name email phone plain_password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await sendWelcomeWhatsApp(user);

    res.status(200).json({
      message: "WhatsApp message sent successfully",
      messageId: result.messageId,
      to: result.to,
      mode: result.mode,
    });
  } catch (error) {
    if (error.code === "WHATSAPP_NOT_CONFIGURED") {
      return res.status(503).json({ message: error.message });
    }
    res.status(error.status || 500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// New API endpoint to check subscription status
exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentDate = new Date();
    let subscriptionStatus = user.subscription_status;

    // Auto-update subscription status if expired
    if (user.subscription_end && user.subscription_end < currentDate) {
      subscriptionStatus = "expired";
      await User.findByIdAndUpdate(userId, { subscription_status: "expired" });
    }

    res.status(200).json({
      plan: user.plan,
      subscription_status: subscriptionStatus,
      subscription_start: user.subscription_start,
      subscription_end: user.subscription_end,
      is_active: subscriptionStatus === "active",
      days_remaining: user.subscription_end ? 
        Math.ceil((user.subscription_end - currentDate) / (1000 * 60 * 60 * 24)) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// New API endpoint to validate license key
exports.validateLicenseKey = async (req, res) => {
  try {
    const { license_key } = req.body;
    
    const user = await User.findOne({ license_key });
    
    if (!user) {
      return res.status(404).json({ 
        valid: false, 
        message: "Invalid license key" 
      });
    }

    if (user.license_status === "blocked") {
      return res.status(403).json({ 
        valid: false, 
        message: "License key is blocked" 
      });
    }

    res.status(200).json({
      valid: true,
      user_id: user._id,
      user_name: user.name,
      user_email: user.email,
      license_status: user.license_status,
      plan: user.plan
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Return the currently authenticated user's profile (excluding password).
exports.getUserProfile = async (req, res) => {
  try {
    // `protect` middleware sets `req.user`
    const user = req.user;
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure we don't leak sensitive fields
    const userObj = typeof user.toObject === 'function' ? user.toObject() : user;
    delete userObj.password;
    delete userObj.plain_password;

    res.status(200).json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// New API endpoint to block/unblock user
exports.toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_blocked } = req.body;
    
    const user = await User.findByIdAndUpdate(
      id, 
      { is_blocked },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({
      message: `User ${is_blocked ? "blocked" : "unblocked"} successfully`,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// New API endpoint to update license status
exports.updateLicenseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { license_status } = req.body;
    
    const user = await User.findByIdAndUpdate(
      id, 
      { license_status },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({
      message: `License ${license_status === "active" ? "activated" : "blocked"} successfully`,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      user_type: user.user_type,
      admin_id: user.user_type === "user" ? user.admin_id : user._id,
      plan: user.plan,
      subscription_status: user.subscription_status,
      license_status: user.license_status
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};