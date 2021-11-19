const mongoose = require("mongoose");

const tableItemSchema = new mongoose.Schema({
  code: String,
  material: String,
  quantity: Number,
  unit: String,
  price: Number,
  amount: Number,
  gst: Number,
  gst_amount: Number,
  total: Number,
  required_date: String,
  available_stock: Number,
});

const vendorSchema = new mongoose.Schema({
  vendor_name: String,
  reason: String,
  grand_total: Number,
  table_items: [tableItemSchema],
});

const quote_list_Schema = new mongoose.Schema({
  type: String,
  category: String,
  vendor_list: [vendorSchema],
});

const quoteSchema = new mongoose.Schema({
  store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  created_on: { type: Date, default: Date.now },
  emp_id: Number,
  prf_number: String,
  // quot_number: new FormControl(),
  // quot_date: new FormControl(),
  // project_short: new FormControl(),
  // sub_category: new FormControl(),
  // description: new FormControl(),
  quote_list: [quote_list_Schema],
});

const collections = mongoose.model("quotations", quoteSchema);

module.exports = collections;
