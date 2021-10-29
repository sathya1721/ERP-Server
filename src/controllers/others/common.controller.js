"use strict";
const mongoose = require('mongoose');
const store = require("../../models/store.model");
// const admin = require("../../models/admin.model");
// const product = require("../../models/product.model");
// const orderList = require("../../models/order_list.model");
// const dpWalletMgmt = require("../../models/dp_wallet_mgmt.model");
// const storeFeatures = require("../../models/store_features.model");
// const ysSubscribers = require("../../models/ys_subscribers.model");
// const ysCampEnquiry = require("../../models/ys_campaign_enquiry.model");
// const ysPackages = require("../../models/ys_packages.model");
// const currencyList = require("../../models/currency_list.model");
// const testing = require("../../models/testing.model");
const defaultSetup = require('../../../config/default.setup');

exports.check_email_availability = (req, res) => {
    if(req.body.email) {
        req.body.email = req.body.email.trim();
        req.body.email = req.body.email.toLowerCase();
    }
    store.findOne({ email: req.body.email }, function(err, response) {
        if(!err && response) 
        {
            console.log("Email already exist");
            res.json({ status: false, error: err, message: "Email already exist" });
        }
        else 
        {
            console.log("New Email");
            res.json({ status: true });
            // storeFeatures.findOne({ $or: [ { "sub_users.email": req.body.email }, { "vendors.email": req.body.email } ] }, function(err, response) {
            //     if(!err && !response) { res.json({ status: true }); }
            //     else { res.json({ status: false, error: err, message: "Email already exist" }); }
            // });
        }
    });
}

