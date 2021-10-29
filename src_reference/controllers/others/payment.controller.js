"use strict";
const request = require('request');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const store = require("../../models/store.model");
const admin = require("../../models/admin.model");
const deployDetails = require("../../models/deploy_details.model");
const dpWalletMgmt = require("../../models/dp_wallet_mgmt.model");
const ysOrders = require("../../models/ys_orders.model");
const defaultSetup = require('../../../config/default.setup');
const setupConfig = require("../../../config/setup.config");
const storeService = require("../../../services/store.service");

exports.razorpay_webhook = (req, res) => {
    admin.findOne({ _id: mongoose.Types.ObjectId(req.params.id) }, function(err, response) {
        if(!err && response) {
            let adminDetails = response;
            let signature = req.get('x-razorpay-signature');
	        let validSignature = Razorpay.validateWebhookSignature(JSON.stringify(req.body), signature, req.params.id);
            if(validSignature) {
                let orderData = req.body.payload.payment.entity;
                orderData.webhook = true;
                let paymentId = orderData.id;
                let orderType = orderData.notes.my_order_type;
                let orderId = orderData.notes.my_order_id;
                // COMPLETED
                if(orderData.status === 'captured') {
                    // for client signup
                    if(orderType=='dp_wallet') {
                        dpWalletMgmt.findOne({ _id: mongoose.Types.ObjectId(orderId), status: 'inactive' }, function(err, response) {
                            if(!err && response) {
                                let orderDetails = response;
                                dpWalletMgmt.findByIdAndUpdate(orderId, { $set: { payment_success: true, "payment_details.payment_id": paymentId, status: "active" } }, function(err, response) {
                                    if(!err && response) {
                                        // update credit
                                        store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderDetails.store_id) },
                                        { $inc: { "dp_wallet_details.balance": orderDetails.final_price } }, { new: true }, function(err, response) {
                                            if(!err && response) {
                                                dpWalletMgmt.findByIdAndUpdate(orderId, { $set: { balance: response.dp_wallet_details.balance } }, function(err, response) { });
                                                res.json({ status: true });
                                            }
                                            else { res.json({ status: false, message: 'Credit update error. Please contact yourstore team' }); }
                                        });
                                    }
                                    else { res.json({ status: false, message: 'Payment update error. Please contact yourstore team' }); }
                                });
                            }
                            else { res.json({ status: false, message: 'Invalid Order' }); }
                        });
                    }
                    else if(orderType=='purchase_plan' || orderType=='plan_renewal' || orderType=='purchase_app') {
                        ysOrders.findOne({ _id: mongoose.Types.ObjectId(orderId), status: 'inactive' }, function(err, response) {
                            if(!err && response) {
                                let orderDetails = response;
                                ysOrders.findByIdAndUpdate(orderId, { $set: { payment_success: true, "payment_details.payment_id": paymentId, status: "active" } }, function(err, response) {
                                    if(!err && response) {
                                        if(orderType=='purchase_plan')
                                        {
                                            store.findOne({ _id: mongoose.Types.ObjectId(orderDetails.store_id) }, function(err, response) {
                                                if(!err && response) {
                                                    let storeDetails = response;
                                                    let startDate = new Date().setHours(0,0,0,0);
                                                    let expiryDate = new Date(startDate).setDate(new Date(startDate).getDate() + (30*orderDetails.package_details.month));
                                                    expiryDate = new Date(expiryDate).setHours(23,59,59,999);
                                                    // transaction date
                                                    let transEndDate = new Date(expiryDate).setDate(new Date(expiryDate).getDate() - 5);
                                                    let transactionRange = { from: new Date(startDate), to: new Date(transEndDate) };
                                                    store.findByIdAndUpdate(storeDetails._id, {
                                                        $set: {
                                                            "package_details.billing_status": true, "package_details.expiry_date": new Date(expiryDate),
                                                            "package_details.transaction_range": transactionRange
                                                        }
                                                    }, function(err, response) {
                                                        res.json({ status: true });
                                                    });
                                                }
                                                else { res.json({ status: false, message: 'Invalid Store' }); }
                                            });
                                        }
                                        else if(orderType=='plan_renewal') {
                                            store.aggregate([
                                                { $match: { _id: mongoose.Types.ObjectId(orderDetails.store_id) } },
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
                                                    let newFeaturesList = [];
                                                    storeDetails.package_details.paid_features.forEach(element => {
                                                        let tIndex = trialFeatures.findIndex(obj => obj.name==element && obj.status=='inactive');
                                                        if(tIndex==-1) { newFeaturesList.push(featuresList[fIndex].keyword); }
                                                    });
                                                    let startDate = new Date().setHours(0,0,0,0);
                                                    let expiryDate = new Date(startDate).setDate(new Date(startDate).getDate() + (30*orderDetails.package_details.month));
                                                    expiryDate = new Date(expiryDate).setHours(23,59,59,999);
                                                    // transaction date
                                                    let transEndDate = new Date(expiryDate).setDate(new Date(expiryDate).getDate() - 5);
                                                    let transactionRange = { from: storeDetails.package_details.transaction_range.from, to: new Date(transEndDate) };
                                                    store.findByIdAndUpdate(storeDetails._id, {
                                                        $set: {
                                                            "package_details.billing_status": true, "package_details.expiry_date": new Date(expiryDate),
                                                            "package_details.paid_features": newFeaturesList, "package_details.transaction_range": transactionRange
                                                        }
                                                    }, function(err, response) {
                                                        res.json({ status: true });
                                                    });
                                                }
                                                else { res.json({ status: false, message: 'Invalid Store' }); }
                                            });
                                        }
                                        else {
                                            store.aggregate([
                                                { $match: { _id: mongoose.Types.ObjectId(orderDetails.store_id) } },
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
                                                    let storeFeatures = storeDetails.package_details.paid_features;
                                                    let trialFeatures = storeDetails.deployDetails[0].trial_features;
                                                    orderDetails.app_list.forEach(element => {
                                                        let tIndex = trialFeatures.findIndex(obj => obj.name==element.name);
                                                        if(tIndex!=-1) {
                                                            trialFeatures[tIndex].paid = true;
                                                            trialFeatures[tIndex].status = "active";
                                                            trialFeatures[tIndex].uninstalled = false;
                                                        }
                                                        storeFeatures.push(element.name);
                                                    });
                                                    storeFeatures = new Set(storeFeatures);
                                                    storeFeatures = Array.from(storeFeatures);
                                                    deployDetails.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(storeDetails._id) },
                                                    { $set: { trial_features: trialFeatures } }, function(err, response) {
                                                        store.findByIdAndUpdate(storeDetails._id, { $set: { "package_details.paid_features": storeFeatures } }, function(err, response) {
                                                            res.json({ status: true });
                                                        });
                                                    });
                                                }
                                                else { res.json({ status: false, message: 'Invalid Store' }); }
                                            });
                                        }
                                    }
                                    else { res.json({ status: false, message: 'Payment update error. Please contact yourstore team' }); }
                                });
                            }
                            else { res.json({ status: false, message: 'Invalid Order' }); }
                        });
                    }
                    else { res.json({ status: false, message: 'Invalid Order' }); }
                }
                else {
                    // if order status != success
                    if(orderType=='dp_wallet') {
                        dpWalletMgmt.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderId) },
                        { $set: { "payment_details.payment_id": paymentId, "payment_details.status": orderData.status } }, function(err, response) {
                            res.json({ status: false, message: 'Payment '+orderData.status });
                        });
                    }
                    else if(orderType=='purchase_plan' || orderType=='plan_renewal' || orderType=='purchase_app') {
                        ysOrders.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderId) },
                        { $set: { "payment_details.payment_id": paymentId, "payment_details.status": orderData.status } }, function(err, response) {
                            res.json({ status: false, message: 'Payment '+orderData.status });
                        });
                    }
                    else { res.json({ status: false, message: 'Payment '+orderData.status }); }
                }
            }
            else { res.json({ status: false, message: "Invalid signature" }); }
        }
        else { res.json({ status: false, message: "Invalid user" }); }
    });
}

exports.razorpay_store_payment_status = (req, res) => {
    admin.findOne({ _id: mongoose.Types.ObjectId(req.params.id) }, function(err, response) {
        if(!err && response) {
            let adminDetails = response;
            let paymentMethod = adminDetails.payment_types.filter(object => object.name=='Razorpay');
            if(paymentMethod.length && req.body.razorpay_payment_id)
            {
                let paymentCallback = paymentMethod[0].admin_panel_callback;
                let instance = new Razorpay(paymentMethod[0].config);
                instance.payments.fetch(req.body.razorpay_payment_id, function(err, orderData) {
                    if(!err && orderData) {
                        let paymentId = orderData.id;
                        let orderType = orderData.notes.my_order_type;
                        let orderId = orderData.notes.my_order_id;
                        // COMPLETED
                        if(orderData.status === 'captured') {
                            // for client signup
                            if(orderType=='dp_wallet') {
                                dpWalletMgmt.findOne({ _id: mongoose.Types.ObjectId(orderId) }, function(err, response) {
                                    if(!err && response) {
                                        let orderDetails = response;
                                        if(orderDetails.status=='active') {
                                            // redirect to website
                                            res.writeHead(301, {Location: paymentCallback.return_url+'/wallet/'+orderDetails._id});
                                            res.end();
                                        }
                                        else {
                                            dpWalletMgmt.findByIdAndUpdate(orderId, { $set: { payment_success: true, "payment_details.payment_id": paymentId, status: "active" } }, function(err, response) {
                                                if(!err && response) {
                                                    // update credit
                                                    store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderDetails.store_id) },
                                                    { $inc: { "dp_wallet_details.balance": orderDetails.final_price } }, { new: true }, function(err, response) {
                                                        if(!err && response) {
                                                            dpWalletMgmt.findByIdAndUpdate(orderId, { $set: { balance: response.dp_wallet_details.balance } }, function(err, response) { });
                                                            res.writeHead(301, {Location: paymentCallback.return_url+'/wallet/'+orderDetails._id});
                                                            res.end();
                                                        }
                                                        else {
                                                            res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Credit update error. Please contact yourstore team"});
                                                            res.end();
                                                        }
                                                    });
                                                }
                                                else {
                                                    res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Payment update error. Please contact yourstore team"});
                                                    res.end();
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        // if invalid order
                                        res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Invalid payment"});
                                        res.end();
                                    }
                                });
                            }
                            else if(orderType=='purchase_plan' || orderType=='plan_renewal' || orderType=='purchase_app') {
                                ysOrders.findOne({ _id: mongoose.Types.ObjectId(orderId) }, function(err, response) {
                                    if(!err && response) {
                                        let orderDetails = response;
                                        if(orderDetails.status=='active') {
                                            // redirect to website
                                            res.writeHead(301, {Location: paymentCallback.return_url+'/ys-order/'+orderDetails._id});
                                            res.end();
                                        }
                                        else {
                                            ysOrders.findByIdAndUpdate(orderId, { $set: { payment_success: true, "payment_details.payment_id": paymentId, status: "active" } }, function(err, response) {
                                                if(!err && response) {
                                                    if(orderType=='purchase_plan')
                                                    {
                                                        store.findOne({ _id: mongoose.Types.ObjectId(orderDetails.store_id) }, function(err, response) {
                                                            if(!err && response) {
                                                                let storeDetails = response;
                                                                let startDate = new Date().setHours(0,0,0,0);
                                                                let expiryDate = new Date(startDate).setDate(new Date(startDate).getDate() + (30*orderDetails.package_details.month));
                                                                expiryDate = new Date(expiryDate).setHours(23,59,59,999);
                                                                // transaction date
                                                                let transEndDate = new Date(expiryDate).setDate(new Date(expiryDate).getDate() - 5);
                                                                let transactionRange = { from: new Date(startDate), to: new Date(transEndDate) };
                                                                store.findByIdAndUpdate(storeDetails._id, {
                                                                    $set: {
                                                                        "package_details.billing_status": true, "package_details.expiry_date": new Date(expiryDate),
                                                                        "package_details.transaction_range": transactionRange, "package_details.package_id": orderDetails.package_details._id
                                                                    }
                                                                }, function(err, response) {
                                                                    res.writeHead(301, {Location: paymentCallback.return_url+'/ys-order/'+orderDetails._id});
                                                                    res.end();
                                                                });
                                                            }
                                                            else {
                                                                res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Invalid store"});
                                                                res.end();
                                                            }
                                                        });
                                                    }
                                                    else if(orderType=='plan_renewal') {
                                                        store.aggregate([
                                                            { $match: { _id: mongoose.Types.ObjectId(orderDetails.store_id) } },
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
                                                                let newFeaturesList = [];
                                                                storeDetails.package_details.paid_features.forEach(element => {
                                                                    let tIndex = trialFeatures.findIndex(obj => obj.name==element && obj.status=='inactive');
                                                                    if(tIndex==-1) { newFeaturesList.push(featuresList[fIndex].keyword); }
                                                                });
                                                                let startDate = new Date().setHours(0,0,0,0);
                                                                let expiryDate = new Date(startDate).setDate(new Date(startDate).getDate() + (30*orderDetails.package_details.month));
                                                                expiryDate = new Date(expiryDate).setHours(23,59,59,999);
                                                                // transaction date
                                                                let transEndDate = new Date(expiryDate).setDate(new Date(expiryDate).getDate() - 5);
                                                                let transactionRange = { from: storeDetails.package_details.transaction_range.from, to: new Date(transEndDate) };
                                                                store.findByIdAndUpdate(storeDetails._id, {
                                                                    $set: {
                                                                        "package_details.billing_status": true, "package_details.expiry_date": new Date(expiryDate),
                                                                        "package_details.paid_features": newFeaturesList, "package_details.transaction_range": transactionRange
                                                                    }
                                                                }, function(err, response) {
                                                                    res.writeHead(301, {Location: paymentCallback.return_url+'/ys-order/'+orderDetails._id});
                                                                    res.end();
                                                                });
                                                            }
                                                            else {
                                                                res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Invalid store"});
                                                                res.end();
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        store.aggregate([
                                                            { $match: { _id: mongoose.Types.ObjectId(orderDetails.store_id) } },
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
                                                                let storeFeatures = storeDetails.package_details.paid_features;
                                                                let trialFeatures = storeDetails.deployDetails[0].trial_features;
                                                                orderDetails.app_list.forEach(element => {
                                                                    let tIndex = trialFeatures.findIndex(obj => obj.name==element.name);
                                                                    if(tIndex!=-1) {
                                                                        trialFeatures[tIndex].paid = true;
                                                                        trialFeatures[tIndex].status = "active";
                                                                        trialFeatures[tIndex].uninstalled = false;
                                                                    }
                                                                    storeFeatures.push(element.name);
                                                                });
                                                                storeFeatures = new Set(storeFeatures);
                                                                storeFeatures = Array.from(storeFeatures);
                                                                deployDetails.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(storeDetails._id) },
                                                                { $set: { trial_features: trialFeatures } }, function(err, response) {
                                                                    store.findByIdAndUpdate(storeDetails._id, { $set: { "package_details.paid_features": storeFeatures } }, function(err, response) {
                                                                        res.writeHead(301, {Location: paymentCallback.return_url+'/ys-order/'+orderDetails._id});
                                                                        res.end();
                                                                    });
                                                                });
                                                            }
                                                            else {
                                                                res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Invalid store"});
                                                                res.end();
                                                            }
                                                        });
                                                    }
                                                }
                                                else {
                                                    res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Payment update error. Please contact yourstore team"});
                                                    res.end();
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        // if invalid order
                                        res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Invalid payment"});
                                        res.end();
                                    }
                                });
                            }
                            else {
                                // if invalid order type
                                res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Invalid payment"});
                                res.end();
                            }
                        }
                        else {
                            // if order status != success
                            if(orderType=='dp_wallet') {
                                dpWalletMgmt.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderId) },
                                { $set: { "payment_details.payment_id": paymentId, "payment_details.status": orderData.status } }, function(err, response) {
                                    res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Payment "+orderData.status});
                                    res.end();
                                });
                            }
                            else if(orderType=='purchase_plan' || orderType=='plan_renewal' || orderType=='purchase_app') {
                                ysOrders.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderId) },
                                { $set: { "payment_details.payment_id": paymentId, "payment_details.status": orderData.status } }, function(err, response) {
                                    res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Payment "+orderData.status});
                                    res.end();
                                });
                            }
                            else {
                                res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Payment "+orderData.status});
                                res.end();
                            }
                        }
                    }
                    else {
                        // if invalid order
                        res.writeHead(301, {Location: paymentCallback.cancel_url+"?response=Payment Error"});
                        res.end();
                    }
                });
            }
            else {
                // invalid payment method
                res.send('Invalid payment method or missing paymentId');
            }
        }
        else {
            // invalid store
            res.send('Invalid Data');
        }
    });
}