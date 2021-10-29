"use strict";
const mongoose = require('mongoose');
const store = require("../../models/store.model");
const admin = require("../../models/admin.model");
const product = require("../../models/product.model");
const orderList = require("../../models/order_list.model");
const dpWalletMgmt = require("../../models/dp_wallet_mgmt.model");
const storeFeatures = require("../../models/store_features.model");
const ysSubscribers = require("../../models/ys_subscribers.model");
const ysCampEnquiry = require("../../models/ys_campaign_enquiry.model");
const ysPackages = require("../../models/ys_packages.model");
const currencyList = require("../../models/currency_list.model");
const testing = require("../../models/testing.model");
const defaultSetup = require('../../../config/default.setup');

exports.check_email_availability = (req, res) => {
    if(req.body.email) {
        req.body.email = req.body.email.trim();
        req.body.email = req.body.email.toLowerCase();
    }
    store.findOne({ email: req.body.email }, function(err, response) {
        if(!err && response) {
            res.json({ status: false, error: err, message: "Email already exist" });
        }
        else {
            storeFeatures.findOne({ $or: [ { "sub_users.email": req.body.email }, { "vendors.email": req.body.email } ] }, function(err, response) {
                if(!err && !response) { res.json({ status: true }); }
                else { res.json({ status: false, error: err, message: "Email already exist" }); }
            });
        }
    });
}

exports.subscribe_newsletter = (req, res) => {
    ysSubscribers.findOne({ "email": req.body.email }, function(err, response) {
        if(!err && !response) {
            ysSubscribers.create(req.body, function(err, response) {
                if(!err && response) { res.json({ status: true }); }
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else res.json({ status: true });
    });
}

exports.campaign_enquiry = (req, res) => {
    ysCampEnquiry.create(req.body, function(err, response) {
        if(!err && response) { res.json({ status: true }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

exports.packages = (req, res) => {
    admin.findOne({}, function(err, response) {
        if(!err && response) {
            let paymentTypes = [];
            response.payment_types.filter(obj => obj.status=='active').forEach(element => {
                paymentTypes.push({ name: element.name, btn_name: element.btn_name, mode: element.mode, app_config: element.app_config });
            });
            ysPackages.find({ status: 'active' }, function(err, response) {
                if(!err && response) { res.json({ status: true, list: response, payment_types: paymentTypes, daywise_discounts: defaultSetup.daywise_discounts }); }
                else { res.json({ status: false, error: err, message: "failure" }); }
            });
        }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.payment_types = (req, res) => {
    admin.findOne({}, function(err, response) {
        if(!err && response) {
            let paymentTypes = [];
            response.payment_types.filter(obj => obj.status=='active').forEach(element => {
                paymentTypes.push({ name: element.name, btn_name: element.btn_name, mode: element.mode, app_config: element.app_config });
            });
            res.json({ status: true, list: paymentTypes });
        }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.ys_currency_list = (req, res) => {
    currencyList.find({}, function(err, response) {
        if(!err && response) { res.json({ status: true, list: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.product_stock_update = (req, res) => {
    if(req.params.store_id && mongoose.Types.ObjectId.isValid(req.params.store_id) && req.body.secret) {
        store.findOne({ _id: mongoose.Types.ObjectId(req.params.store_id), status: "active", secret: req.body.secret }, function(err, response) {
            if(!err && response) {
                let storeDetails = response;
                if(req.body.data && req.body.data.sku && req.body.data.qty>=0) {
                    product.findOne({ store_id: mongoose.Types.ObjectId(storeDetails._id), sku: req.body.data.sku, status: 'active', variant_status: false }, function(err, response) {
                        if(!err && response) {
                            let productDetails = response;
                            product.findByIdAndUpdate(productDetails._id, { $set: { stock: req.body.data.qty } }, function(err, response) {
                                if(!err) { res.json({ status: 1, message: "Updated successfully" }); }
                                else { res.json({ status: 0, message: "Unable to update", error: err }); }
                            });
                        }
                        else { res.json({ status: 0, message: "Invalid product" }); }
                    });
                }
                else { res.json({ status: 0, message: "Invalid data" }); }
            }
            else { res.json({ status: 0, message: "Invalid user" }); }
        });
    }
    else { res.json({ status: 0, message: "Invalid parameter or missing secret" }); }
}

exports.dunzo_webhook = (req, res) => {
    testing.create({ body: req.body, created_on: new Date() }, function(err, response) {
        if(!err && response) {
            if(req.body.reference_id) {
                let splitArr = req.body.reference_id.split("@");
                if(splitArr.length>1) {
                    let orderId = splitArr[1];
                    orderList.aggregate([
                        { $match:
                            { _id: mongoose.Types.ObjectId(orderId) }
                        },
                        { $lookup: 
                            { from: "stores", localField: "store_id", foreignField: "_id", as: "storeDetails" }
                        }
                    ], function(err, response) {
                        if(!err && response[0]) {
                            let orderDetails = response[0];
                            let storeDetails = orderDetails.storeDetails[0];
                            if(req.body.state=='cancelled' && storeDetails.dp_wallet_status && storeDetails.dp_wallet_details) {
                                let dpWalletData = {
                                    store_id: orderDetails.store_id, order_id: orderDetails._id, order_number: orderDetails.order_number, order_type: 'credit',
                                    order_info: 'Refund', order_price: orderDetails.shipping_method.dp_charges, final_price: orderDetails.shipping_method.dp_charges,
                                    status: 'active', currency: storeDetails.currency_types.filter(obj => obj.default_currency)[0].country_code, additional_charges: 0
                                }
                                if(storeDetails.dp_wallet_details.charge_type=='amount') {
                                    dpWalletData.additional_charges = storeDetails.dp_wallet_details.charge_value;
                                }
                                else {
                                    dpWalletData.additional_charges = Math.ceil(orderDetails.final_price*(storeDetails.dp_wallet_details.charge_value/100));
                                }
                                dpWalletData.final_price += dpWalletData.additional_charges;
                                dpWalletData.balance = storeDetails.dp_wallet_details.balance + dpWalletData.final_price;
                                // update credit
                                dpWalletMgmt.create(dpWalletData, function(err, response) {
                                    if(!err && response)
                                    {
                                        store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderDetails.store_id) },
                                        { $inc: { "dp_wallet_details.balance": dpWalletData.final_price } }, function(err, response) {
                                            if(!err && response) { res.json({ status: true }); }
                                            else { res.json({ status: false, message: 'Credit update error' }); }
                                        });
                                    }
                                    else { res.json({ status: false, error: err, message: "Unable to add record to statement" }); }
                                });
                            }
                            else {
                                let cpOrders = orderDetails.cp_orders;
                                let cpIndex = cpOrders.findIndex(obj => obj.name=='Dunzo' && obj.status=='active');
                                if(cpIndex != -1) {
                                    cpOrders[cpIndex].cp_status = req.body.state;
                                    orderList.findByIdAndUpdate(orderDetails._id, { $set: { cp_orders: cpOrders } }, function(err, response) {});
                                }
                                res.json({ status: true });
                            }
                        }
                        else { res.json({ status: false, error: err, message: "Invalid Order" }); }
                    });
                }
                else { res.json({ status: false, message: 'Invalid reference id' }); }
            }
            else { res.json({ status: false, message: 'reference id not exist' }); }
        }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}