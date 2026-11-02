const Category = require('../models/Category');
const { resolveAdminId } = require('../utils/resolveAdminId');
const { sheetRowsFromBuffer, sendExcel } = require('../utils/excelHelpers');

exports.createCategory = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);
    if (!adminId) {
      return res.status(400).json({ error: 'Could not resolve admin_id for this user' });
    }

    const data = {
      ...req.body,
      admin_id: adminId,
      created_by: req.user._id,
    };

    const newCategory = new Category(data);
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCategorys = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);

    // All staff under the same admin share one category list (matches product create validation).
    const categorys = await Category.find({ admin_id: adminId });
    res.status(200).json(categorys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkFacultyAccess = async (id, user) => {
  const faculty = await Category.findById(id);
  if (!faculty) throw new Error('Faculty not found');

  const loggedInAdminId = resolveAdminId(user);
  if (faculty.admin_id.toString() !== loggedInAdminId.toString()) {
    throw new Error('Unauthorized access');
  }

  return faculty;
};

exports.updateCategory = async (req, res) => {
  try {
    await checkFacultyAccess(req.params.id, req.user);

    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await checkFacultyAccess(req.params.id, req.user);
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportCategoriesToExcel = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);
    const docs = await Category.find({ admin_id: adminId }).lean();
    const rows = docs.map((c) => ({
      name: c.name || '',
      description: c.description || '',
    }));
    return sendExcel(res, rows, 'categories-export.xlsx');
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.importCategoriesFromExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'Excel file is required' });
    const adminId = resolveAdminId(req.user);
    const rows = sheetRowsFromBuffer(req.file.buffer);
    const toCreate = [];
    let skipped = 0;
    rows.forEach((row) => {
      const name = String(row.name || '').trim();
      if (!name) {
        skipped += 1;
        return;
      }
      toCreate.push({
        name,
        description: String(row.description || '').trim() || undefined,
        admin_id: adminId,
        created_by: req.user._id,
      });
    });
    if (!toCreate.length) return res.status(400).json({ error: 'No valid rows found' });
    const inserted = await Category.insertMany(toCreate);
    return res.status(201).json({ message: 'Categories imported', inserted: inserted.length, skipped });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
