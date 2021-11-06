const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },    
    status: { type: String, default : "active" },
    vendor_name : { type : String },
    contact_person : { type : String },
    address : { type : String },
    vendor_gst : { type : String },
    mobile : { type : String },
    phone : { type : String },
    fax : { type : String },
    email : { type : String },
    emp_id : { type : String }    
});

const collections = mongoose.model('vendors', vendorSchema);

module.exports = collections;