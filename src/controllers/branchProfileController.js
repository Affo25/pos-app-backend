const BranchProfile = require('../models/BranchProfile');

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
