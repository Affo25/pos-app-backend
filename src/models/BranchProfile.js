const mongoose = require("mongoose");

const branchProfileSchema = new mongoose.Schema(
  {
    branch_name: { type: String, required: true },
    code: { type: String, required: true },
    vp_name: { type: String, required: true },
    vp_title: { type: String, required: true },
    vp_contact: { type: String, required: true },
    vp_email: { type: String, required: true },
    street_address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    status: { type: String },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: "createdOn", updatedAt: "updatedOn" } }
);

module.exports = mongoose.model("BranchProfile", branchProfileSchema);
