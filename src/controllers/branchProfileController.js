const BranchProfile = require('../models/BranchProfile');
const { sheetRowsFromBuffer, sendExcel } = require('../utils/excelHelpers');

exports.createBranchProfile = async (req, res) => {
  try {
    const branchData = {
      ...req.body,
      user_id: req.user._id,
    };
    const newBranchProfile = new BranchProfile(branchData);
    await newBranchProfile.save();
    res.status(201).json(newBranchProfile);
  } catch (err) {
 res.status(500).json({
      error: err.message,
      success: false
    });  }
};

exports.getBranchProfiles = async (req, res) => {
  try {
    const branchProfiles = await BranchProfile.find();
    res.status(200).json(branchProfiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateBranchProfile = async (req, res) => {
  try {
    const updated = await BranchProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
res.status(403).json({
      error: err.message,
      success: false
    });  }
};

exports.deleteBranchProfile = async (req, res) => {
  try {
    await BranchProfile.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'BranchProfile deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportBranchProfilesToExcel = async (req, res) => {
  try {
    const docs = await BranchProfile.find().lean();
    const rows = docs.map((b) => ({
      branch_name: b.branch_name || '',
      code: b.code || '',
      vp_name: b.vp_name || '',
      vp_title: b.vp_title || '',
      vp_contact: b.vp_contact || '',
      vp_email: b.vp_email || '',
      city: b.city || '',
      status: b.status || 'active',
    }));
    return sendExcel(res, rows, 'branches-export.xlsx');
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.importBranchProfilesFromExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'Excel file is required' });
    const rows = sheetRowsFromBuffer(req.file.buffer);
    const toCreate = [];
    let skipped = 0;
    rows.forEach((row) => {
      const branch_name = String(row.branch_name || row.name || '').trim();
      const code = String(row.code || '').trim();
      if (!branch_name || !code) {
        skipped += 1;
        return;
      }
      toCreate.push({
        branch_name,
        code,
        vp_name: String(row.vp_name || '').trim() || 'N/A',
        vp_title: String(row.vp_title || '').trim() || 'Manager',
        vp_contact: String(row.vp_contact || row.phone || '').trim() || '0000000000',
        vp_email: String(row.vp_email || row.email || '').trim() || 'branch@example.com',
        city: String(row.city || '').trim() || undefined,
        status: String(row.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
        user_id: req.user._id,
      });
    });
    if (!toCreate.length) return res.status(400).json({ error: 'No valid rows found' });
    const inserted = await BranchProfile.insertMany(toCreate);
    return res.status(201).json({ message: 'Branches imported', inserted: inserted.length, skipped });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
