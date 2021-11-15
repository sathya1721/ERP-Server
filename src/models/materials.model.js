const mongoose = require('mongoose');

const materialsSchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },      
    status: { type: String, default : "active" },
    emp_id : { type : String },
    type : { type : String },
    category : { type : String },
    short_name : { type : String },
    hsn_code : { type : String },
    material_code : { type : String },
    name : { type : String },
    unit : { type : String },
    price : { type : String },
    gst : { type : String }
});

const collections = mongoose.model('materials', materialsSchema);

module.exports = collections;