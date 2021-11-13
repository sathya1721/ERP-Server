const mongoose = require('mongoose');

const product_categorySchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },  
    product_type : { type : String },
    name : { type : String },
    short_name : { type : String },
    status: { type: String, default : "active" },
    emp_id : { type : String }
});

const collections = mongoose.model('product_category', product_categorySchema);

module.exports = collections;