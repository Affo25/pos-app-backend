const mongoose = require('mongoose');
const Products = require('../models/Products');
const Category = require('../models/Category');
const XLSX = require('xlsx');

function normalizeCategoryId(raw) {
  if (raw == null || raw === '') return null;
  let v = raw;
  if (typeof v === 'object' && v !== null && v._id != null) v = v._id;
  const s = String(v).trim();
  if (!/^[a-fA-F0-9]{24}$/.test(s)) return null;
  return s;
}

exports.createProducts = async (req, res) => {
  try {
    const adminId =
      req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const categoryId = normalizeCategoryId(req.body.category);
    if (!categoryId) {
      return res.status(400).json({ error: 'category must be a valid 24-character category id' });
    }

    const categoryDoc = await Category.findOne({
      _id: categoryId,
      admin_id: adminId,
    });
    if (!categoryDoc) {
      return res.status(400).json({ error: 'Invalid or unknown category for this account' });
    }

    const data = {
      ...req.body,
      category: categoryId,
      admin_id: adminId,
      created_by: req.user._id,
    };
    // Omit empty/null sku so pre-save can assign a unique SKU (avoids E11000 duplicate key { sku: null })
    if (data.sku == null || (typeof data.sku === 'string' && data.sku.trim() === '')) {
      delete data.sku;
    } else if (typeof data.sku === 'string') {
      data.sku = data.sku.trim();
    }

    const parseNonNegNumber = (raw, fieldLabel) => {
      if (raw === undefined || raw === null || raw === '') {
        return { ok: false, error: `${fieldLabel} is required` };
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        return { ok: false, error: `${fieldLabel} must be a non-negative number` };
      }
      return { ok: true, value: n };
    };

    const aq = parseNonNegNumber(data.available_quantity, 'available_quantity');
    if (!aq.ok) return res.status(400).json({ error: aq.error });
    const up = parseNonNegNumber(data.unit_price, 'unit_price');
    if (!up.ok) return res.status(400).json({ error: up.error });
    data.available_quantity = aq.value;
    data.unit_price = up.value;

    const newProducts = new Products(data);
    await newProducts.save();
    await newProducts.populate('category', 'name');
    res.status(201).json(newProducts);
  } catch (err) {
    if (err.code === 11000) {
      const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
      const msg =
        field === 'sku'
          ? 'This SKU is already in use. Enter a different SKU or leave it blank to auto-generate.'
          : `Duplicate value for ${field}`;
      return res.status(409).json({ error: msg, field });
    }
    if (err.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({
        error: first?.message || err.message || 'Validation failed',
      });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.getProductss = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const query = {
      admin_id: adminId,
    };

    if (req.user.user_type === 'user') {
      query.created_by = req.user.id;
    }

    const productss = await Products.find(query).populate('category', 'name');
    res.status(200).json(productss);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkProductAccess = async (id, user) => {
  const product = await Products.findById(id);
  if (!product) throw new Error('Product not found');

  const loggedInAdminId = user.user_type === 'admin' ? user._id : user.admin_id;
  if (product.admin_id.toString() !== loggedInAdminId.toString()) {
    throw new Error('Unauthorized access');
  }

  return product;
};

// In your productController.js
exports.updateProducts = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Validate product ID
    if (!id) {
      return res.status(400).json({ 
        error: 'Product ID is required',
        message: 'Please provide a valid product ID' 
      });
    }

    // ✅ Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: 'Invalid product ID format',
        message: 'The provided product ID is not a valid MongoDB ObjectId' 
      });
    }

    // ✅ Check product access permissions
    await checkProductAccess(id, req.user);

    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    // Find existing product
    const existingProduct = await Products.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ 
        error: 'Product not found',
        message: `No product found with ID: ${id}` 
      });
    }

    // Create an object to store the fields to update
    const updateFields = {};

    // Handle category if present (must be ObjectId)
    if (req.body.category !== undefined) {
      const categoryId = normalizeCategoryId(req.body.category);
      if (!categoryId) {
        return res.status(400).json({ error: 'category must be a valid 24-character category id' });
      }
      const categoryDoc = await Category.findOne({
        _id: categoryId,
        admin_id: adminId,
      });
      if (!categoryDoc) {
        return res.status(400).json({ error: 'Invalid or unknown category for this account' });
      }
      updateFields.category = categoryId;
    }

    // Handle supplier_name (string field)
    if (req.body.supplier_name !== undefined) {
      updateFields.supplier_name = req.body.supplier_name.trim();
    }

    // Handle basic product fields
    const stringFields = [
      'name', 'batch_number', 'sku', 'rack_location', 'medicine_size',
      'manufacturer', 'manufacturer_license_no', 'manufacturer_registration_no',
      'storage_instructions', 'notes', 'image'
    ];

    const numberFields = [
      'available_quantity', 'minimum_stock_alert', 'unit_price',
      'discount', 'gst'
    ];

    const arrayFields = ['alternative_medicines'];
    const booleanFields = ['is_prescription_required'];
    const dateFields = ['expiry_date'];

    // Process string fields
    stringFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field]?.trim();
      }
    });

    // Process number fields
    numberFields.forEach(field => {
      if (req.body[field] !== undefined) {
        let value = Number(req.body[field]);
        if (isNaN(value)) value = 0;
        
        if (field === 'discount' || field === 'gst') {
          value = Math.min(100, Math.max(0, value));
        } else if (field === 'available_quantity' || field === 'minimum_stock_alert' || field === 'unit_price') {
          value = Math.max(0, value);
        }
        
        updateFields[field] = value;
      }
    });

    // Process array fields
    arrayFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = Array.isArray(req.body[field]) ? req.body[field] : [];
      }
    });

    // Process boolean fields
    booleanFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = Boolean(req.body[field]);
      }
    });

    // Process date fields
    dateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const date = new Date(req.body[field]);
        if (!isNaN(date.getTime())) {
          updateFields[field] = date;
        }
      }
    });

    // Handle status field
    if (req.body.status !== undefined) {
      const validStatuses = ['active', 'inactive'];
      if (validStatuses.includes(req.body.status)) {
        updateFields.status = req.body.status;
      } else {
        return res.status(400).json({ error: 'Status must be either "active" or "inactive"' });
      }
    }

    // Calculate total_value if unit_price or available_quantity changed
    const newUnitPrice = updateFields.unit_price !== undefined ? updateFields.unit_price : existingProduct.unit_price;
    const newQuantity = updateFields.available_quantity !== undefined ? updateFields.available_quantity : existingProduct.available_quantity;
    
    if (updateFields.unit_price !== undefined || updateFields.available_quantity !== undefined) {
      updateFields.total_value = newUnitPrice * newQuantity;
    }

    // Update the product
    const updated = await Products.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('category', 'name')
     .populate('created_by', 'name email')
     .populate('admin_id', 'name');

    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updated
    });
  } catch (err) {
    console.error('Error updating product:', err);
    
    // Handle specific MongoDB errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ 
        error: `Duplicate key error: ${field} already exists`,
        field: field
      });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }
    
    // Handle cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        error: `Invalid ${err.path}: ${err.value}`,
        message: 'Please provide a valid product ID'
      });
    }
    
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProducts = async (req, res) => {
  try {
  await checkProductAccess(req.params.id, req.user);
    await Products.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Products deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStockReport = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const query = { admin_id: adminId };
    if (req.user.user_type === 'user') {
      query.created_by = req.user.id;
    }

    const products = await Products.find(query).populate('category', 'name').lean();
    const now = new Date();

    const summary = {
      total_products: products.length,
      total_quantity: products.reduce((sum, p) => sum + Number(p.available_quantity || 0), 0),
      total_stock_value: products.reduce((sum, p) => sum + Number(p.total_value || 0), 0),
      low_stock_count: products.filter(
        (p) => Number(p.available_quantity || 0) <= Number(p.minimum_stock_alert || 0)
      ).length,
      expired_count: products.filter((p) => p.expiry_date && new Date(p.expiry_date) < now).length,
    };

    res.status(200).json({ summary, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const normalizeKey = (key) =>
  String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const parseExcelDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

exports.importProductsFromExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ error: 'Excel sheet is empty' });
    }

    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const createdBy = req.user._id;

    const categoryDocs = await Category.find({ admin_id: adminId }).lean();
    const categoryByName = new Map(
      categoryDocs.map((c) => [String(c.name || '').trim().toLowerCase(), c._id])
    );
    const categoryIdSet = new Set(categoryDocs.map((c) => String(c._id)));

    const toCreate = [];
    let skipped = 0;

    rows.forEach((rawRow) => {
      const row = {};
      Object.keys(rawRow).forEach((k) => {
        row[normalizeKey(k)] = rawRow[k];
      });

      const name = String(row.name || '').trim();
      const batch_number = String(row.batch_number || row.batch || '').trim();
      const expiry_date = parseExcelDate(row.expiry_date || row.expiry);
      const supplier_name = String(row.supplier_name || row.supplier || '').trim();
      const unit_price = Number(row.unit_price ?? row.price ?? 0);
      const available_quantity = Number(row.available_quantity ?? row.quantity ?? 0);

      const catRaw = row.category;
      let categoryId = null;
      if (catRaw !== undefined && catRaw !== null && String(catRaw).trim() !== '') {
        const catStr = String(catRaw).trim();
        if (
          mongoose.Types.ObjectId.isValid(catStr) &&
          catStr.length === 24 &&
          categoryIdSet.has(catStr)
        ) {
          categoryId = catStr;
        } else {
          categoryId = categoryByName.get(catStr.toLowerCase());
        }
      }

      if (
        !name ||
        !batch_number ||
        !expiry_date ||
        !supplier_name ||
        !Number.isFinite(unit_price) ||
        !Number.isFinite(available_quantity) ||
        !categoryId
      ) {
        skipped += 1;
        return;
      }

      toCreate.push({
        name,
        batch_number,
        expiry_date,
        available_quantity,
        minimum_stock_alert: Number(row.minimum_stock_alert ?? 0),
        unit_price,
        supplier_name,
        category: categoryId,
        manufacturer: String(row.manufacturer || '').trim(),
        rack_location: String(row.rack_location || '').trim(),
        discount: Number(row.discount ?? 0),
        gst: Number(row.gst ?? 0),
        status: String(row.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
        manufacturer_license_no: String(row.manufacturer_license_no || '').trim(),
        manufacturer_registration_no: String(row.manufacturer_registration_no || '').trim(),
        medicine_size: String(row.medicine_size || row.medecine_size || '').trim(),
        sku: `SKU-${new mongoose.Types.ObjectId().toString()}`,
        admin_id: adminId,
        created_by: createdBy,
      });
    });

    if (!toCreate.length) {
      return res.status(400).json({ error: 'No valid rows found in uploaded Excel file' });
    }

    const inserted = await Products.insertMany(toCreate);
    return res.status(201).json({
      message: 'Products imported successfully',
      inserted: inserted.length,
      skipped,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
