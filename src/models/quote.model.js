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
  store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  created_on: { type: Date, default: Date.now },
  type: String,
  category: String,
  emp_id: Number,
  prf_number: String,
  quote_number: String,
  quote_date: String,
  // project_short: new FormControl(),
  // sub_category: new FormControl(),
  // description: new FormControl(),
  vendor_list: [vendorSchema],
});

const quoteSchema = new mongoose.Schema([quote_list_Schema]);

const collections = mongoose.model("quotations", quoteSchema);

module.exports = collections;
