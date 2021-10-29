const mongoose = require('mongoose');
const bcrypt = require("bcrypt-nodejs");

// PAYMENT TYPES
const paymentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  btn_name: { type: String, required: true },
  rank: { type: Number, default: 1 },
  config: { type: Object },
  app_config: { type: Object },
  transaction_fees: { type: Number, default: 0 },
  admin_panel_callback: {
    return_url: { type: String },
    cancel_url: { type: String }
  },
  status: { type: String, default: 'active' }
});

/* ADMIN */
const adminSchema = new mongoose.Schema({
    email: { type: String },
    password: { type: String },
    base_url: { type: String },
    session_key: { type: String, required: true },
    status: { type: String, default: 'active' },
    payment_types: [ paymentSchema ],
    mail_config: {
      transporter: { type: Object },
      send_from: { type: String }
    },
    auto_deploy: { type: Boolean },
    jenkin_token: { type: String },
    next_port: { type: Number },
    signup_offer_in_percentage: { type: Number, default: 0 }
});

/* Cheking Password */
adminSchema.methods.comparePassword = function(pwd, next) {
  bcrypt.compare(pwd, this.password, function(err, isMatch) {
    return next(err, isMatch);
  });
};

module.exports = mongoose.model('admin', adminSchema, 'admin');