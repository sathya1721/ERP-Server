const mongoose = require('mongoose');

const product_typeSchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },  
    name : { type : String },
    status: { type: String, default : "active" },
    emp_id : { type : String }
});

const collections = mongoose.model('product_type', product_typeSchema);

module.exports = collections;