"use strict";
const request = require('request');
const mongoose = require('mongoose');
const admin = require("../../models/admin.model");
const store = require("../../models/store.model");
const ysOrders = require("../../models/ys_orders.model");
const paymentStatusService = require("../../../services/payment_status.service");
const defaultSetup = require('../../../config/default.setup');
const setupConfig = require("../../../config/setup.config");
const storeService = require("../../../services/store.service");

exports.inactive_payments = (req, res) => {
    let queryParams = {};
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    if(req.body.type=='All') {
        queryParams = { status: 'inactive', created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) } };
    }
    else {
        queryParams = { status: 'inactive', payment_type: req.body.type, created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) } };
    }
    ysOrders.aggregate([
        { $match : queryParams },
        { $lookup:
            {
               from: 'stores',
               localField: 'store_id',
               foreignField: '_id',
               as: 'storeDetails'
            }
        }
    ], function(err, response) {
        if(!err && response) {
            res.json({ status: true, list: response });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.razorpay_payment_status = (req, res) => {
    if(req.body.type=='client_signup') {
        admin.findOne({}, function(err, response) {
            if(!err && response) {
                let adminDetails = response;
                ysOrders.aggregate([
                    { $match : { _id: mongoose.Types.ObjectId(req.body._id), status: "inactive" } },
                    { 
                        $lookup: {
                            from: 'stores',
                            localField: 'store_id',
                            foreignField: '_id',
                            as: 'storeDetails'
                        }
                    }
                ], function(err, response) {
                    if(!err && response[0]) {
                        let orderDetails = response[0];
                        let storeDetails = orderDetails.storeDetails[0];
                        let razorpayDetails = adminDetails.payment_types.filter(obj => obj.name=='Razorpay');
                        if(razorpayDetails.length)
                        {
                            paymentStatusService.razorpayPaymentStatusForYS(orderDetails, razorpayDetails[0].config).then((paymentData) => {
                                ysOrders.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderId) },
                                { $set: { payment_id: paymentData.id, status: "active", payment_details: paymentData } }, function(err, response) {
                                    if(!err && response) {
                                        // complete store creation
                                        let formData = { image: defaultSetup.logo, store_id: orderDetails.store_id.toString() };
                                        request.post({ url: setupConfig.image_api_base+'/logo_upload', form: formData }, function (err, response, body) {
                                            if(!err && body) {
                                                store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderDetails.store_id) }, { $set: { status: "active" } }, { new: true }, function(err, response) {
                                                    if(!err && response) {
                                                        storeService.createStore(response, adminDetails).then((respData) => { res.json(respData); })
                                                        .catch(function(errData) { res.json(errData); });
                                                    }
                                                    else { res.json({ status: false, error: err, message: "Store activation error" }); }
                                                });
                                            }
                                            else { res.json({ status: false, error: err, message: "Logo upload error" }); }
                                        });
                                    }
                                    else { res.json({ status: false, error: err, message: "Payment update error" }); }
                                });
                            }).catch((paymentData) => { res.json({ status: false, data: paymentData }); });
                        }
                        else { res.json({ status: false, message: "Invalid payment method" }); }
                    }
                    else { res.json({ status: false, error: err, message: "Failure" }); }
                });
            }
            else { res.json({ status: false, error: err, message: "Invalid user" }); }
        });   
    }
	else { res.json({ status: false, message: "Invalid order type" }); }
}