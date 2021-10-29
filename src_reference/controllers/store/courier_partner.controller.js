"use strict";
const mongoose = require('mongoose');
const request = require('request');
const admin = require("../../models/admin.model");
const store = require("../../models/store.model");
const orderList = require("../../models/order_list.model");
const dpWalletMgmt = require("../../models/dp_wallet_mgmt.model");
const commonService = require("../../../services/common.service");
const createPayment = require("../../../services/create_payment.service");

// DELHIVERY COURIER
exports.delhivery_create_order = (req, res) => {
    orderList.aggregate([
        { $match:
            { store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id), status: 'active' }
        },
        { $lookup: 
            { from: "store_features", localField: "store_id", foreignField: "store_id", as: "storeFeatures" }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let orderDetails = response[0];
            let cpOrders = orderDetails.cp_orders;
            let courierPartnerDetails = orderDetails.storeFeatures[0].courier_partners.filter(obj => obj.name=='Delhivery');
            if(courierPartnerDetails.length) {
                courierPartnerDetails = courierPartnerDetails[0];
                let cpIndex = cpOrders.findIndex(obj => obj.name=='Delhivery');
                if(cpIndex!=-1) {
                    // order already created
                    let contactNo = orderDetails.shipping_address.mobile;
                    if(orderDetails.shipping_address.dial_code) contactNo = orderDetails.shipping_address.dial_code+' '+contactNo;
                    const options = {
                        url: courierPartnerDetails.base_url+'/api/p/edit',
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Token '+courierPartnerDetails.token },
                        body: {
                            waybill: cpOrders[cpIndex].order_id, cancellation: "false", phone: contactNo,
                            name: orderDetails.shipping_address.name, add: orderDetails.shipping_address.address
                        },
                        json: true
                    };
                    request(options, function(err, response, body) {
                        if(!err && response.statusCode == 200) {
                            if(body.status) {
                                cpOrders[cpIndex].status = "active";
                                let trackingLink = "https://www.delhivery.com/track/package/"+cpOrders[cpIndex].order_id;
                                let shippingData = { cp_status: true, "shipping_method.name": "Delhivery", "shipping_method.tracking_number": cpOrders[cpIndex].order_id,
                                "shipping_method.tracking_link": trackingLink, cp_orders: cpOrders };
                                orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                                { $set: shippingData }, function(err, response) {
                                    if(!err) { res.json({ status: true }); }
                                    else { res.json({ status: false, error: err, message: "Invalid order" }); }
                                });
                            }
                            else { res.json({ status: false, err: body, message: "Unable to create order." }); }
                        }
                        else { res.json({ status: false, message: "Unable to create order." }); }
                    });
                }
                else {
                    // verify pincode
                    let pincodeVerifyUrl = courierPartnerDetails.base_url+'/c/api/pin-codes/json/?token='+courierPartnerDetails.token+'&filter_codes='+orderDetails.shipping_address.pincode;
                    request.get(pincodeVerifyUrl, function (err, response, body) {
                        if(!err && response.statusCode == 200) {
                            let deliveryDetails = JSON.parse(body);
                            if(deliveryDetails.delivery_codes.length) {
                                // create order
                                const options = {
                                    url: courierPartnerDetails.base_url+'/api/cmu/create.json',
                                    method: 'POST',
                                    headers: { 'Content-Type': 'text/plain', 'Authorization': 'Token '+courierPartnerDetails.token },
                                    body: req.body.form_data
                                };
                                request(options, function(err, response, body) {
                                    if(!err && response.statusCode == 200) {
                                        let delhiveryData = JSON.parse(body);
                                        if(delhiveryData.success) {
                                            cpOrders.push({ name: "Delhivery", order_id: delhiveryData.packages[0].waybill });
                                            let trackingLink = "https://www.delhivery.com/track/package/"+delhiveryData.packages[0].waybill;
                                            let shippingData = { cp_orders: cpOrders, cp_status: true, "shipping_method.name": "Delhivery",
                                                "shipping_method.tracking_number": delhiveryData.packages[0].waybill, "shipping_method.tracking_link": trackingLink
                                            };
                                            orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                                            { $set: shippingData }, function(err, response) {
                                                if(!err) { res.json({ status: true }); }
                                                else { res.json({ status: false, error: err, message: "Invalid order" }); }
                                            });
                                        }
                                        else { res.json({ status: false, err: delhiveryData, message: "Delhivery order creation error" }); }
                                    }
                                    else { res.json({ status: false, message: "Unable to create order." }); }
                                });
                            }
                            else { res.json({ status: false, message: "Delivery service not available." }); }
                        }
                        else { res.json({ status: false, message: "Delhivery api service error" }); }
                    });             
                }
            }
            else { res.json({ status: false, message: "Invalid courier service" }); }
        }
        else { res.json({ status: false, error: err, message: "Invalid order" }); }
    });
}

exports.delhivery_update_order = (req, res) => {
    orderList.aggregate([
        { $match:
            { store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id), status: 'active' }
        },
        { $lookup: 
            { from: "store_features", localField: "store_id", foreignField: "store_id", as: "storeFeatures" }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let orderDetails = response[0];
            let courierPartnerDetails = response[0].storeFeatures[0].courier_partners.filter(obj => obj.name=='Delhivery');
            if(courierPartnerDetails.length) {
                courierPartnerDetails = courierPartnerDetails[0];
                // update details
                let contactNo = orderDetails.shipping_address.mobile;
                if(orderDetails.shipping_address.dial_code) contactNo = orderDetails.shipping_address.dial_code+' '+contactNo;
                let formData = {
                    waybill: orderDetails.shipping_method.tracking_number, phone: contactNo,
                    name: orderDetails.shipping_address.name, add: orderDetails.shipping_address.address
                };
                if(req.body.cancellation) {
                    formData.cancellation = "true";
                    orderDetails.cp_orders.map(element => { element.status = 'inactive' });
                }
                const options = {
                    url: courierPartnerDetails.base_url+'/api/p/edit',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Token '+courierPartnerDetails.token },
                    body: formData,
                    json: true
                };
                request(options, function(err, response, body) {
                    if(!err && response.statusCode == 200) {
                        if(body.status) {
                            if(req.body.cancellation) {
                                let shippingData = {
                                    cp_status: false, cp_orders: orderDetails.cp_orders, "shipping_method.name": "",
                                    "shipping_method.tracking_number": "", "shipping_method.tracking_link": ""
                                };
                                orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                                { $set: shippingData }, function(err, response) {
                                    if(!err) { res.json({ status: true }); }
                                    else { res.json({ status: false, error: err, message: "Invalid order" }); }
                                });
                            }
                            else { res.json({ status: true }); }
                        }
                        else { res.json({ status: false, err: body, message: "Unable to update." }); }
                    }
                    else { res.json({ status: false, message: "Unable to update." }); }
                });
            }
            else { res.json({ status: false, message: "Invalid courier service" }); }
        }
        else { res.json({ status: false, error: err, message: "Invalid order" }); }
    });
}
// DELHIVERY COURIER END

// DUNZO
exports.dunzo_create_order = (req, res) => {
    orderList.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id), status: 'active' }, function(err, response) {
        if(!err && response) {
            let orderDetails = response;
            store.aggregate([
                { $match:
                    { _id: mongoose.Types.ObjectId(orderDetails.store_id), dp_wallet_status: true, "dp_wallet_details.balance": { $gt: 0 } }
                },
                { $lookup:
                    { from: "store_features", localField: "_id", foreignField: "store_id", as: "storeFeatures" }
                }
            ], function(err, response) {
                if(!err && response[0]) {
                    let storeDetails = response[0];
                    // charge calc
                    let dpWalletData = {
                        store_id: orderDetails.store_id, order_id: orderDetails._id, order_number: orderDetails.order_number, order_type: 'debit',
                        order_info: 'New Order', order_price: orderDetails.shipping_method.dp_charges, final_price: orderDetails.shipping_method.dp_charges,
                        status: 'active', currency: storeDetails.currency_types.filter(obj => obj.default_currency)[0].country_code, additional_charges: 0
                    }
                    let walletBalance = storeDetails.dp_wallet_details.balance;
                    if(storeDetails.dp_wallet_details.charge_type=='amount') {
                        dpWalletData.additional_charges = storeDetails.dp_wallet_details.charge_value;
                    }
                    else {
                        dpWalletData.additional_charges = Math.ceil(orderDetails.final_price*(storeDetails.dp_wallet_details.charge_value/100));
                    }
                    dpWalletData.final_price += dpWalletData.additional_charges;
                    dpWalletData.balance = walletBalance - dpWalletData.final_price;
                    if(dpWalletData.final_price > 0 && walletBalance >= dpWalletData.final_price) {
                        let cpOrders = orderDetails.cp_orders;
                        let courierPartnerDetails = storeDetails.storeFeatures[0].courier_partners.filter(obj => obj.name=='Dunzo');
                        if(courierPartnerDetails.length) {
                            courierPartnerDetails = courierPartnerDetails[0];
                            const options = {
                                method: 'POST',
                                url: courierPartnerDetails.base_url+'/api/v2/tasks',
                                headers: {
                                    'Content-Type': 'application/json', 'Accept-Language': 'en_US', 'client-id': courierPartnerDetails.metadata.client_id,
                                    'Authorization': courierPartnerDetails.token
                                },
                                body: req.body.form_data,
                                json: true
                            };
                            request(options, function(err, response, body) {
                                if(!err) {
                                    if(response.statusCode == 200 || response.statusCode == 201) {
                                        // order created
                                        cpOrders.push({ name: "Dunzo", order_id: body.task_id });
                                        let shippingData = { cp_orders: cpOrders, cp_status: true };
                                        orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                                        { $set: shippingData }, function(err, response) {
                                            if(!err) {
                                                // update debit
                                                dpWalletMgmt.create(dpWalletData, function(err, response) {
                                                    if(!err && response)
                                                    {
                                                        store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderDetails.store_id) },
                                                        { $inc: { "dp_wallet_details.balance": -dpWalletData.final_price } }, function(err, response) {
                                                            if(!err && response) { res.json({ status: true }); }
                                                            else { res.json({ status: false, message: 'Credit update error' }); }
                                                        });
                                                    }
                                                    else { res.json({ status: false, error: err, message: "Unable to add record to statement" }); }
                                                });
                                            }
                                            else { res.json({ status: false, error: err, message: "Invalid order" }); }
                                        });
                                    }
                                    else { res.json({ status: false, error: response.statusCode, message: body.message }); }
                                }
                                else { res.json({ status: false, error: err, message: "Unable to create order." }); }
                            });
                        }
                        else { res.json({ status: false, message: "Invalid courier service" }); }
                    }
                    else { res.json({ status: false, message: "Insufficient balance in wallet" }); }
                }
                else { res.json({ status: false, error: err, message: "Invalid user | Wallet not enabled | Insufficient balance in wallet" }); }
            });
        }
        else { res.json({ status: false, error: err, message: "Invalid order" }); }
    });
}

exports.dunzo_order_status = (req, res) => {
    orderList.aggregate([
        { $match:
            { store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.query.order_id), status: 'active' }
        },
        { $lookup: 
            { from: "store_features", localField: "store_id", foreignField: "store_id", as: "storeFeatures" }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let orderDetails = response[0];
            let cpOrders = orderDetails.cp_orders;
            let cpIndex = cpOrders.findIndex(obj => obj.name=='Dunzo' && obj.status=='active' && obj.order_id==req.query.courier_id);
            let courierPartnerDetails = orderDetails.storeFeatures[0].courier_partners.filter(obj => obj.name=='Dunzo');
            if(courierPartnerDetails.length && cpIndex!=-1) {
                courierPartnerDetails = courierPartnerDetails[0];
                const options = {
                    method: 'GET',
                    url: courierPartnerDetails.base_url+'/api/v1/tasks/'+cpOrders[cpIndex].order_id+'/status',
                    headers: {
                        'Content-Type': 'application/json', 'Accept-Language': 'en_US', 'client-id': courierPartnerDetails.metadata.client_id,
                        'Authorization': courierPartnerDetails.token
                    },
                    json: true
                };
                request(options, function(err, response, body) {
                    if(!err) {
                        if(response.statusCode == 200 || response.statusCode == 201 || response.statusCode == 204 || response.statusCode == 304) {
                            res.json({ status: true, data: body });
                        }
                        else { res.json({ status: false, error: response.statusCode, message: body.message }); }
                    }
                    else { res.json({ status: false, error: err, message: "Unable to get status." }); }
                });
            }
            else { res.json({ status: false, message: "Invalid courier service" }); }
        }
        else { res.json({ status: false, error: err, message: "Invalid order" }); }
    });
}

exports.cancel_dunzo_order = (req, res) => {
    orderList.aggregate([
        { $match:
            { store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id), status: 'active' }
        },
        { $lookup: 
            { from: "store_features", localField: "store_id", foreignField: "store_id", as: "storeFeatures" }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let orderDetails = response[0];
            let cpOrders = orderDetails.cp_orders;
            let cpIndex = cpOrders.findIndex(obj => obj.name=='Dunzo' && obj.status=='active');
            let courierPartnerDetails = orderDetails.storeFeatures[0].courier_partners.filter(obj => obj.name=='Dunzo');
            if(courierPartnerDetails.length && cpIndex!=-1) {
                courierPartnerDetails = courierPartnerDetails[0];
                cpOrders.map(element => { element.status = 'inactive' });
                const options = {
                    method: 'POST',
                    url: courierPartnerDetails.base_url+'/api/v1/tasks/'+cpOrders[cpIndex].order_id+'/_cancel',
                    headers: {
                        'Content-Type': 'application/json', 'Accept-Language': 'en_US', 'client-id': courierPartnerDetails.metadata.client_id,
                        'Authorization': courierPartnerDetails.token
                    },
                    body: req.body.form_data,
                    json: true
                };
                request(options, function(err, response, body) {
                    if(!err) {
                        if(response.statusCode == 200 || response.statusCode == 201 || response.statusCode == 204 || response.statusCode == 304) {
                            let shippingData = { cp_status: false, cp_orders: cpOrders };
                            orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                            { $set: shippingData }, function(err, response) {
                                if(!err) { res.json({ status: true }); }
                                else { res.json({ status: false, error: err, message: "Invalid order" }); }
                            });
                        }
                        else { res.json({ status: false, error: response.statusCode, message: body.message }); }
                    }
                    else { res.json({ status: false, error: err, message: "Unable to cancel order." }); }
                });
            }
            else { res.json({ status: false, message: "Invalid courier service" }); }
        }
        else { res.json({ status: false, error: err, message: "Invalid order" }); }
    });
}

// WALLET
exports.wallet_statement = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) {
            let balance = 0;
            if(response.dp_wallet_details && response.dp_wallet_details.balance) {
                balance = response.dp_wallet_details.balance;
            }
            dpWalletMgmt.find({ store_id: mongoose.Types.ObjectId(req.id), status: 'active' }, function(err, response) {
                if(!err && response) { res.json({ status: true, list: response, balance: balance }); }
                else { res.json({ status: true, list: [], balance: balance }); }
            });
        }
        else { res.json({ status: false, error: err, message: "Invalid user" }); }
    });
}

exports.wallet_topup = (req, res) => {
    if(req.body.order_price > 0) {
        store.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
            if(!err && response) {
                let storeDetails = response;
                admin.findOne({}, function(err, response) {
                    let paymentDetails = response.payment_types.filter(obj => obj.name==req.body.payment_details.name)[0];
                    req.body.currency_type = storeDetails.currency_types.filter(obj => obj.default_currency)[0];
                    req.body.store_id = req.id;
                    req.body.order_number = "WT-"+commonService.orderNumber();
                    req.body.order_type = "credit";
                    req.body.status = "inactive";
                    let finalAmount = req.body.order_price;
                    let transactionCharge = Math.ceil(finalAmount*(paymentDetails.transaction_fees/100));
                    finalAmount = finalAmount - transactionCharge;
                    if(finalAmount<0) finalAmount = 0;
                    req.body.final_price = finalAmount;
                    dpWalletMgmt.create(req.body, function(err, response) {
                        if(!err && response)
                        {
                            let orderDetails = response;
                            orderDetails.customer_email = storeDetails.email;
                            if(orderDetails.payment_details.name=="Razorpay")
                            {
                                // create payment
                                createPayment.createRazorpayForDpWallet(orderDetails, function(err, response) {
                                    if(!err && response) {
                                        res.json({ status: true, data: response });
                                    }
                                    else {
                                        res.json({ status: false, error: err, message: response });
                                    }
                                });
                            }
                            else { res.json({ status: false, message: "Invalid payment method" }); }
                        }
                        else { res.json({ status: false, error: err, message: "Failure" }); }
                    });
                });
            }
            else { res.json({ status: false, error: err, message: "Invalid user" }); }
        });
    }
    else { res.json({ status: false, message: "Invalid order amount" }); }
}