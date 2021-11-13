const mongoose = require('mongoose');

const locListSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rank: { type: String, default: 1 },
    mobile: { type: String},
    address: { type: String },
    map_url: { type: String },
    user_id: { type: String },
    role: { type: String },
    department: { type: String },
    short_name: { type: String },
    locality: { type: String },
    city: { type: String },
    manager: { type: String },
    contact_number : { type: String },
    payment_terms: { type: String },
    hsn_code: { type: String },
    gst_no: { type: String },
    pan_no: { type: String },
    status: { type: String, default : "active" },
    updated_on: { type: Date, default: Date.now }
});

const locationSchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },  
    location_list: [locListSchema],
    emp_id : { type : String }
});

const collections = mongoose.model('locations', locationSchema);

module.exports = collections;