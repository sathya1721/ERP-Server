"use strict";
const mongoose = require('mongoose');
const productFeatures = require("../../models/product_features.model");
const storeFeatures = require("../../models/store_features.model");
const store = require("../../models/store.model");
const admin = require("../../models/admin.model");
const ysOrders = require("../../models/ys_orders.model");
const ysPackages = require("../../models/ys_packages.model");
const ysFeatures = require("../../models/ys_features.model");
const deployDetails = require("../../models/deploy_details.model");
const commonService = require("../../../services/common.service");
const createPayment = require("../../../services/create_payment.service");

exports.product_features = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.store_features = (req, res) => {
    storeFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

// YS Features
exports.ys_features = (req, res) => {
    ysPackages.find({ status: 'active' }, function(err, response) {
        if(!err && response)
        {
            let packageList = response;
            deployDetails.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
                if(!err && response) {
                    let storeDeployDetails = response;
                    if(req.query.id && mongoose.Types.ObjectId.isValid(req.query.id)) {
                        ysFeatures.findOne({ _id: mongoose.Types.ObjectId(req.query.id), status: 'active' }, function(err, response) {
                            if(!err && response) { res.json({ status: true, data: response, packages: packageList, deploy_details: storeDeployDetails }); }
                            else { res.json({ status: false, error: err, message: "failure" }); }
                        });
                    }
                    else {
                        ysFeatures.find({ status: 'active' }, function(err, response) {
                            if(!err && response) { res.json({ status: true, list: response, packages: packageList, deploy_details: storeDeployDetails }); }
                            else { res.json({ status: false, error: err, message: "failure" }); }
                        });
                    }
                }
                else { res.json({ status: false, error: err, message: "Unable to get deploy details" }); }
            });
        }
        else { res.json({ status: false, error: err, message: "Unable to get packages" }); }
    });
}

exports.install_ys_feature = (req, res) => {
    ysFeatures.findOne({ _id: mongoose.Types.ObjectId(req.body.feature_id), status: 'active' }, function(err, response) {
        if(!err && response) {
            req.body.name = response.keyword;
            deployDetails.findOne({ store_id: mongoose.Types.ObjectId(req.id), "trial_features.name": req.body.name }, function(err, response) {
                if(!err && response) {
                    deployDetails.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), "trial_features.name": req.body.name },
                    { $set: { "trial_features.$.status": "active", "trial_features.$.uninstalled": false } }, { new: true },
                    function(err, response) {
                        if(!err && response) {
                            let deployDetails = response;
                            store.findOne({ _id: mongoose.Types.ObjectId(req.id), "package_details.paid_features": { $in: [req.body.name] } }, function(err, response) {
                                if(!err && response) { res.json({ status: true, data: deployDetails }); }
                                else { res.json({ status: true, data: deployDetails, make_payment: true }); }
                            });
                        }
                        else { res.json({ status: false, error: err, message: "failure" }); }
                    });
                }
                else {
                    deployDetails.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                    { $push: { trial_features: req.body } }, { new: true }, function(err, response) {
                        if(!err && response) { res.json({ status: true, data: response }); }
                        else { res.json({ status: false, error: err, message: "Unable to add" }); }
                    });
                }
            });
        }
        else { res.json({ status: false, message: "Invalid feature" }); }
    });
}

exports.uninstall_ys_feature = (req, res) => {
    ysFeatures.findOne({ _id: mongoose.Types.ObjectId(req.body.feature_id), status: 'active' }, function(err, response) {
        if(!err && response) {
            req.body.name = response.keyword;
            deployDetails.findOne({ store_id: mongoose.Types.ObjectId(req.id), "trial_features.name": req.body.name, "trial_features.status": "active" }, function(err, response) {
                if(!err && response) {
                    deployDetails.findOneAndUpdate({ _id: mongoose.Types.ObjectId(response._id), "trial_features.name": req.body.name },
                    { $set: { "trial_features.$.status": "inactive", "trial_features.$.uninstalled": true } }, { new: true },
                    function(err, response) {
                        if(!err) { res.json({ status: true, data: response }); }
                        else { res.json({ status: false, error: err, message: "failure" }); }
                    });
                }
                else { res.json({ status: false, message: "Invalid feature" }); }
            });
        }
        else { res.json({ status: false, message: "Invalid feature" }); }
    });
}

exports.create_payment = (req, res) => {
    store.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(req.id) } },
        {
            $lookup: {
                from: "deploy_details",
                localField: "_id",
                foreignField: "store_id",
                as: "deployDetails"
            }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let storeData = response[0];
            let storeCurrency = storeData.currency_types.filter(obj => obj.default_currency)[0];
            let feaList = [];
            storeData.deployDetails[0].trial_features.filter(obj => obj.status=='active' && !obj.paid && !obj.uninstalled).forEach(obj => { feaList.push(obj.name) });
            ysFeatures.find({ keyword: { $in: feaList }, status: "active" }, function(err, response) {
                if(!err && response) {
                    let featuresList = JSON.stringify(response);
                    featuresList = JSON.parse(featuresList);
                    let total = 0; feaList = [];
                    let date1 = new Date(new Date().setHours(0,0,0,0));
                    let date2 = new Date(new Date(storeData.package_details.expiry_date).setHours(23,59,59,999));
                    let diffTime = Math.abs(date2 - date1);
                    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))-1;
                    featuresList.forEach(element => {
                        let packIndex = element.linked_packages.findIndex(obj => obj.package_id.toString()==storeData.package_details.package_id.toString());
                        if(packIndex!=-1) {
                            let feaPrice = element.linked_packages[packIndex].currency_types[storeCurrency.country_code].price;
                            element.price = Math.ceil((feaPrice/30)*diffDays);
                            total += element.price;
                            feaList.push({ name: element.name, keyword: element.keyword, price: element.price });
                        }
                    });
                    admin.findOne({}, function(err, response) {
                        let paymentTypes = [];
                        response.payment_types.filter(obj => obj.status == 'active').forEach(element => {
                            paymentTypes.push({ name: element.name, btn_name: element.btn_name, mode: element.mode, app_config: element.app_config });
                        });
                        if(req.body.payment_details && req.body.payment_details.name) {
                            // create payment
                            if(req.body.payment_details.name=="Razorpay")
                            {
                                // create payment
                                let subData = {
                                    store_id: storeData._id, order_type: "purchase_app", amount: total, currency_type: storeCurrency, status: 'inactive',
                                    app_list: feaList, subscription_till: storeData.package_details.expiry_date, payment_details: req.body.payment_details
                                };
                                subData.order_number = commonService.orderNumber();
                                ysOrders.create(subData, function(err, response) {
                                    if(!err && response) {
                                        if(response.payment_details.name=="Razorpay")
                                        {
                                            createPayment.createRazorpayForYsOrder(response, function(err, response) {
                                                if(!err && response) { res.json({ status: true, data: response }); }
                                                else { res.json({ status: false, error: err, message: response }); }
                                            });
                                        }
                                        else { res.json({ status: false, message: "Invalid payment method" }); }
                                    }
                                    else { res.json({ status: false, error: err, message: "Unable to create order" }); }
                                });
                            }
                            else { res.json({ status: false, message: "Invalid payment method" }); }
                        }
                        else {
                            res.json({ status: true, list: featuresList, total: total, payment_types: paymentTypes });
                        }
                    });
                }
                else { res.json({ status: false, error: err, message: "failure" }); }
            });
        }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}