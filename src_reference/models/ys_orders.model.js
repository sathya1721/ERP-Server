const mongoose = require('mongoose');

// APPS LIST
const appSchema = new mongoose.Schema({
    name: { type: String, required: true },
    keyword: { type: String, required: true },
    price: { type: Number, required: true }
}, { _id : false });

const ysOrdersSchema = new mongoose.Schema({
    store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    order_number: { type: String, required: true },
    order_type: { type: String, enum: ['purchase_plan', 'purchase_app', 'plan_renewal'], required: true },
    package_details: {
        _id: { type: mongoose.Schema.Types.ObjectId },
        price: { type: Number },
        discount: { type: Number },
        month: { type: Number }
    },
    app_list: [ appSchema ],
    subscription_till: { type: Date },  // for install app
    transaction_charges: { type: Number },
    amount: { type: Number, required: true },
    currency_type: {
        country_code: { type: String, default: 'INR' },
        html_code: { type: String, default: '&#x20B9;' }
    },
    payment_details: {
        name: { type: String, required: true },
        order_id: { type: String }, // for razorpay
        payment_id: { type: String },
        status: { type: String }
    },
    payment_success: { type: Boolean, default: false },
    status: { type: String, default: 'inactive' },
    created_on: { type: Date, default: Date.now }
});

const collections = mongoose.model('ys_orders', ysOrdersSchema);

module.exports = collections;