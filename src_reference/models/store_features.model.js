const mongoose = require('mongoose');

// AI STYLING
const optionListSchema = new mongoose.Schema({
    heading: { type: String, required: true },
    sub_heading: { type: String },
    link_to: { type: String },
    image: { type: String, required: true }
});

const stylingListSchema = new mongoose.Schema({
    heading: { type: String, required: true },
    sub_heading: { type: String },
    type: { type: String, enum: ['either_or', 'multiple'], required: true },
    option_list: [optionListSchema]
});

// COURIER PARTNERS
const courierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    token: { type: String, required: true },
    base_url: { type: String, required: true },
    metadata: { type: Object }
});

// SUB USERS
const subUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    designation: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    session_key: { type: String, required: true },
    status: { type: String, default: 'active' },
    permission_list: { type: Array, default: [] },
    permissions: { type: Object }
});

// VENDORS
const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact_person: { type: String },
    mobile: { type: String },
    email: { type: String, required: true },
    password: { type: String, required: true },
    session_key: { type: String, required: true },
    status: { type: String, default: 'active' },
    permissions: { type: Object }
});

// SCHEMA
const featuresSchema = new mongoose.Schema({
    store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    sub_users: [ subUserSchema ],
    courier_partners: [ courierSchema ],
    ai_styles: [ stylingListSchema ],
    vendors: [ vendorSchema ]
});

const collections = mongoose.model('store_features', featuresSchema);

module.exports = collections;