const SubCategory = require('../models/SubCategory');

exports.createSubCategory = async (req, res) => {
  try {
     const adminId =
      req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
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
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const query = {
      admin_id: adminId,
    };

    if (req.user.user_type === 'user') {
      query.created_by = req.user.id;
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

  const loggedInAdminId = user.user_type === 'admin' ? user._id : user.admin_id;
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
