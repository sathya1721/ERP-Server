const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema({
  material: String,
  quantity: Number,
  unit: String,
  price: Number,
  delivery_date: Date,
  total: Number,
});

const supplierSchema = new mongoose.Schema({
  company_name: String,
  reason: String,
  contact_person: String,
  mobile: Number,
  comp_address: String,
});

const indentListSchema = new mongoose.Schema({
  type: String,
  location: String,
  department: String,
  prf_date: { type: Date, default: Date.now },
  prf_number: String,
  purpose: String,
  requirement_list: [requirementSchema],
  supplier_list: [supplierSchema],
  cancel_status: Number,
  mail_status: String,
  mail_datetime: Date,
});

const indentSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  created_on: { type: Date, default: Date.now },
  indent_list: [indentListSchema],
});

const collections = mongoose.model("indents", indentSchema);

module.exports = collections;
