const { resolveAdminId } = require('../utils/resolveAdminId');
const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const { sheetRowsFromBuffer, sendExcel } = require('../utils/excelHelpers');

exports.createSubCategory = async (req, res) => {
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

    const newSubCategory = new SubCategory(data);
    await newSubCategory.save();
    res.status(201).json(newSubCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSubCategorys = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);

    const query = {
      admin_id: adminId,
    };

    if (req.user.user_type === 'user') {
      query.created_by = req.user.id || req.user._id;
    }

    const subCategorys = await SubCategory.find(query);
    res.status(200).json(subCategorys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkFacultyAccess = async (id, user) => {
  const faculty = await SubCategory.findById(id);
  if (!faculty) throw new Error('Faculty not found');

  const loggedInAdminId = resolveAdminId(user);
  if (faculty.admin_id.toString() !== loggedInAdminId.toString()) {
    throw new Error('Unauthorized access');
  }

  return faculty;
};

exports.updateSubCategory = async (req, res) => {
  try {
    await checkFacultyAccess(req.params.id, req.user);

    const updated = await SubCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    await checkFacultyAccess(req.params.id, req.user);
    await SubCategory.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'SubCategory deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportSubCategoriesToExcel = async (req, res) => {
  try {
    const adminId = resolveAdminId(req.user);
    const [subs, cats] = await Promise.all([
      SubCategory.find({ admin_id: adminId }).lean(),
      Category.find({ admin_id: adminId }).lean(),
    ]);
    const catName = Object.fromEntries(cats.map((c) => [String(c._id), c.name]));
    const rows = subs.map((s) => ({
      name: s.name || '',
      description: s.description || '',
      category: catName[String(s.category_id)] || s.category_id || '',
      status: s.status || 'active',
    }));
    return sendExcel(res, rows, 'subcategories-export.xlsx');
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.importSubCategoriesFromExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'Excel file is required' });
    const adminId = resolveAdminId(req.user);
    const cats = await Category.find({ admin_id: adminId }).lean();
    const byName = new Map(cats.map((c) => [String(c.name || '').trim().toLowerCase(), String(c._id)]));
    const byId = new Set(cats.map((c) => String(c._id)));
    const rows = sheetRowsFromBuffer(req.file.buffer);
    const toCreate = [];
    let skipped = 0;
    rows.forEach((row) => {
      const name = String(row.name || '').trim();
      const catRaw = String(row.category || row.category_id || '').trim();
      let category_id = null;
      if (byId.has(catRaw)) category_id = catRaw;
      else category_id = byName.get(catRaw.toLowerCase()) || null;
      if (!name || !category_id) {
        skipped += 1;
        return;
      }
      toCreate.push({
        name,
        category_id,
        description: String(row.description || '').trim() || undefined,
        status: String(row.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
        admin_id: adminId,
        created_by: req.user._id,
      });
    });
    if (!toCreate.length) return res.status(400).json({ error: 'No valid rows found' });
    const inserted = await SubCategory.insertMany(toCreate);
    return res.status(201).json({ message: 'Sub categories imported', inserted: inserted.length, skipped });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
