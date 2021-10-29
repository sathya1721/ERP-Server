"use strict";
const mongoose = require('mongoose');
const store = require("../../models/store.model");
const admin = require("../../models/admin.model");
const deployDetails = require("../../models/deploy_details.model");
const ysPackages = require("../../models/ys_packages.model");
const ysFeatures = require("../../models/ys_features.model");
const ysOrders = require("../../models/ys_orders.model");
const orderList = require("../../models/order_list.model");
const createPayment = require("../../../services/create_payment.service");
const commonService = require("../../../services/common.service");
const defaultSetup = require('../../../config/default.setup');

exports.details = (req, res) => {
    deployDetails.findOne({ store_id: mongoose.Types.ObjectId(req.query.store_id) }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, data: response });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.update = (req, res) => {
    deployDetails.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.body.store_id) },
    { $set: req.body }, { new: true }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, data: response });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.purchase_plan = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.body.store_id), status: "active" }, function(err, response) {
        if(!err && response) {
            let storeDetails = response;
            let date1 = new Date(new Date(storeDetails.created_on).setHours(0,0,0,0));
            let date2 = new Date(new Date().setHours(23,59,59,999));
            let diffTime = Math.abs(date2 - date1);
            let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))-1;
            let discPercent = 0; let discAmount = 0;
            let dIndex = defaultSetup.daywise_discounts.findIndex(obj => obj.days==diffDays);
            if(dIndex!=-1) { discPercent = defaultSetup.daywise_discounts[dIndex].discount }
            let currencyType = storeDetails.currency_types.filter(obj => obj.default_currency)[0];
            ysPackages.findOne({ _id: mongoose.Types.ObjectId(req.body.package_id), status: "active" }, function(err, response) {
                if(!err && response) {
                    let priceDetails = response.currency_types[currencyType.country_code];
                    if(discPercent > 0) { discAmount = Math.round(priceDetails.amount*(discPercent/100)); }
                    let packagePrice = priceDetails.live;
                    packagePrice += (priceDetails.amount*req.body.month);
                    packagePrice = packagePrice - discAmount;
                    let subData = {
                        store_id: storeDetails._id, order_type: "purchase_plan", amount: packagePrice, currency_type: currencyType, status: 'inactive',
                        package_details: { _id: req.body.package_id, price: priceDetails.amount, discount: discAmount, month: req.body.month },
                        payment_details: req.body.payment_details
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
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else { res.json({ status: false, error: err, message: "Invalid user" }); }
    });
}

exports.billing_details = (req, res) => {
    store.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(req.body.store_id) } },
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
            let storeDetails = response[0];
            let trialFeatures = storeDetails.deployDetails[0].trial_features;
            let respData = { store_package_details: storeDetails.package_details, subscription_charge: 0, addon_price: 0, transaction_charges: 0 };
            let storeCurrency = storeDetails.currency_types.filter(obj => obj.default_currency)[0].country_code;
            if(storeDetails.package_details.billing_status && storeDetails.package_details.expiry_date) {
                // package details
                ysPackages.find({ status: 'active' }, function(err, response) {
                    if(!err && response) {
                        let packagesList = response.sort((a, b) => 0 - (a.rank > b.rank ? -1 : 1));
                        let packIndex = packagesList.findIndex(obj => obj._id.toString()==storeDetails.package_details.package_id.toString());
                        if(packIndex!=-1) {
                            let packageDetails = packagesList[packIndex];
                            respData.package_details = packageDetails;
                            respData.subscription_charge = respData.package_details.currency_types[storeCurrency].amount;
                            let packagePricing = packageDetails.currency_types[storeCurrency];
                            // get next package
                            let filteredPackages = packagesList.filter(obj => obj.rank > packageDetails.rank);
                            if(filteredPackages.length) { respData.next_package_details = filteredPackages[0]; }
                            // total sales
                            if(!storeDetails.package_details.transaction_range) {
                                storeDetails.package_details.transaction_range = { from: storeDetails.created_on, to: storeDetails.created_on };
                            }
                            orderList.aggregate([
                                {
                                    $match: {
                                        store_id: mongoose.Types.ObjectId(storeDetails._id), status: "active",
                                        created_on: {
                                            $gte: new Date(storeDetails.package_details.transaction_range.from),
                                            $lte: new Date(storeDetails.package_details.transaction_range.to)
                                        }
                                    }
                                },
                                { $group: { _id : null, total_sales : { $sum: "$final_price" } } }
                            ], function(err, response) {
                                let totalSales = 0;
                                if(!err && response[0]) { totalSales = response[0].total_sales; }
                                if(totalSales > packagePricing.transaction_limit) {
                                    let diffAmt = totalSales - packagePricing.transaction_limit;
                                    respData.transaction_charges = Math.ceil(diffAmt*(packagePricing.transaction_fees/100));
                                }
                                // paid features
                                let appList = [];
                                let queryParam = {
                                    "linked_packages.package_id": mongoose.Types.ObjectId(packageDetails._id), status: 'active',
                                    ["linked_packages.currency_types."+storeCurrency+".price"]: { $gt : 0 }
                                };
                                ysFeatures.find(queryParam, function(err, response) {
                                    if(!err && response) {
                                        let featuresList = response;
                                        storeDetails.package_details.paid_features.forEach(element => {
                                            let fIndex = featuresList.findIndex(obj => obj.keyword==element);
                                            let tIndex = trialFeatures.findIndex(obj => obj.name==element && obj.status=='inactive');
                                            if(fIndex!=-1 && tIndex==-1) {
                                                let pIndex = featuresList[fIndex].linked_packages.findIndex(obj =>obj.package_id.toString()==packageDetails._id.toString());
                                                if(pIndex!=-1) {
                                                    let feaPrice = featuresList[fIndex].linked_packages[pIndex].currency_types[storeCurrency].price;
                                                    respData.addon_price += feaPrice;
                                                    appList.push({ name: featuresList[fIndex].name, keyword: featuresList[fIndex].keyword, price: feaPrice });
                                                }
                                            }
                                        });
                                        admin.findOne({}, function(err, response) {
                                            let paymentTypes = [];
                                            response.payment_types.filter(obj => obj.status == 'active').forEach(element => {
                                                paymentTypes.push({ name: element.name, btn_name: element.btn_name, mode: element.mode, app_config: element.app_config });
                                            });
                                            if(req.body.payment_details && req.body.payment_details.name && new Date() > new Date(storeDetails.package_details.transaction_range.to)) {
                                                // create payment
                                                if(req.body.payment_details.name=="Razorpay")
                                                {
                                                    // create payment
                                                    let payableAmount = (respData.subscription_charge+respData.addon_price)*req.body.month;
                                                    let subData = {
                                                        store_id: storeDetails._id, order_type: "plan_renewal", amount: payableAmount, currency_type: storeCurrency,
                                                        package_details: { _id: storeDetails.package_details.package_id, price: respData.subscription_charge, month: req.body.month },
                                                        status: 'inactive', payment_details: req.body.payment_details, app_list: appList, transaction_charges: respData.transaction_charges
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
                                                res.json({ status: true, data: respData, payment_types: paymentTypes });
                                            }
                                        });
                                    }
                                    else { res.json({ status: false, error: err, message: "Unable to fetch features" }); }
                                });
                            });
                        }
                        else { res.json({ status: false, message: "Invalid package" }); }
                    }
                    else { res.json({ status: false, error: err, message: "Packages doesn't exists" }); }
                });
            }
            else { res.json({ status: true, data: respData }); }
        }
        else { res.json({ status: false, error: err, message: "Invalid store" }); }
    });
}