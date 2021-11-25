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

// const indentListSchema = new mongoose.Schema({
//   type: String,
//   location: String,
//   department: String,
//   prf_date: String,
//   prf_number: String,
//   purpose: String,
//   requirement_list: [requirementSchema],
//   supplier_list: [supplierSchema],
//   mail_status: String,
//   // cancel_status: Number,
//   // mail_datetime: Date,
// });
const indentSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  created_on: { type: Date, default: Date.now },
  emp_id: String,
  type: String,
  status: { type: String, default: "active" },
  prf_date: Date,
  prf_number: String,
  purpose: String,
  location: String,
  department: String,
  tax: Number,
  sub_total: Number,
  grand_total: Number,
  mail_status: String,
  quote_raised: String,
  cancel_status: { type: Number, default: 0 },
  requirement_list: [requirementSchema],
  supplier_list: [supplierSchema],
});

const collections = mongoose.model("indents", indentSchema);

module.exports = collections;
