"use strict";
const mongoose = require('mongoose');
const request = require('request');
const dateFormat = require('dateformat');
const store = require("../../models/store.model");
const product = require("../../models/product.model");
const customer = require("../../models/customer.model");
const orderList = require("../../models/order_list.model");
const donationList = require("../../models/donation_list.model");
const storeFeatures = require("../../models/store_features.model");
const mailService = require("../../../services/mail.service");
const setupConfig = require('../../../config/setup.config');
const commonService = require("../../../services/common.service");
const stockService = require("../../../services/stock.service");
const erpService = require("../../../services/erp.service");

exports.manual_order = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response)
        {
            let storeDetails = response;
            customer.findOne({ _id: mongoose.Types.ObjectId(req.body.customer_id) }, function(err, response) {
                if(!err && response)
                {
                    let customerDetails = response;
                    req.body.status = "active";
                    req.body.order_by = "admin";
                    req.body.order_number = commonService.orderNumber();
                    if(customerDetails.unique_id) {
                        req.body.order_number = req.body.order_number+'-'+customerDetails.unique_id;
                    }
                    req.body.invoice_number = "";
                    if(storeDetails.invoice_status) {
                        req.body.invoice_number = commonService.invoiceNumber(storeDetails.invoice_config);
                    }
                    orderList.create(req.body, function(err, response) {
                        if(!err && response) {
                            let orderDetails = response;
                            // ERP
                            let erpDetails = storeDetails.erp_details;
                            if(erpDetails && erpDetails.name=='ambar' && erpDetails.status=='active') {
                                orderDetails.customer_email = customerDetails.email;
                                let erpData = {
                                    erp_config: erpDetails.config,
                                    store_id: storeDetails._id, event_type: 'place_order',
                                    user_agent: req.get('User-Agent'), order_details: orderDetails
                                }
                                erpService.ambar(erpData);
                            }
                            // update next invoice no
                            if(req.body.invoice_number) {
                                store.findByIdAndUpdate(storeDetails._id, { $inc: { "invoice_config.next_invoice_no": 1 } }, function(err, response) { });
                            }
                            // decrease product stock
                            stockService.decProductStock(orderDetails.item_list);
                            // decrease coupon balance
                            if(orderDetails.coupon_list.length) { stockService.updateCouponBalance(orderDetails); }
                            // update offer redeem count
                            if(orderDetails.offer_details) { stockService.incOfferRedeemCount(orderDetails.offer_details); }
                            // send mail
                            if(orderDetails.order_status=="placed") {
                                mailService.sendOrderPlacedMail(null, orderDetails._id).then(result => {
                                    // order placed mail to vendor
                                    mailService.sendOrderPlacedMailToVendor(orderDetails._id);
                                    res.json({ status: true });
                                }).catch(function(error) {
                                    res.json({ status: false, message: error });
                                });
                            }
                            else if(orderDetails.order_status=="confirmed") {
                                mailService.sendOrderConfirmedMail(null, orderDetails._id).then(result => {
                                    res.json({ status: true });
                                }).catch(function(error) {
                                    res.json({ status: false, message: error });
                                });
                            }
                            else {
                                res.json({ status: true });
                            }  
                        }
                        else {
                            res.json({ status: false, error: err, message: "Unable to create order" });
                        }
                    });
                }
                else { res.json({ status: false, message: "Invalid user" }); }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid Store" });
        }
    });  
}

exports.list = (req, res) => {
    // orderStatus -> placed, confirmed, dispatched, delivered, cancelled
    let orderStatus = req.body.type;
    if(orderStatus=="all") { orderStatus = { $in: [ 'placed', 'confirmed', 'dispatched' ] }; }
    let queryParams = {};
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    if(req.body.customer_id=='all')
    {
        queryParams = {
            store_id: mongoose.Types.ObjectId(req.id), status: 'active', order_status: orderStatus,
            [req.body.date_type]: { $gte: new Date(fromDate), $lt: new Date(toDate) }
        };
    }
    else {
        queryParams = {
            store_id: mongoose.Types.ObjectId(req.id), customer_id: mongoose.Types.ObjectId(req.body.customer_id),
            status: 'active', order_status: orderStatus, [req.body.date_type]: { $gte: new Date(fromDate), $lt: new Date(toDate) }
        };
    }
    orderList.aggregate([
        { $match : queryParams },
        { $lookup:
            {
               from: 'customers',
               localField: 'customer_id',
               foreignField: '_id',
               as: 'customerDetails'
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

exports.inactive_list = (req, res) => {
    let queryParams = {};
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    let today = new Date().getDate()+new Date().getMonth()+new Date().getFullYear();
    let selectedDay = new Date(req.body.to_date).getDate()+new Date(req.body.to_date).getMonth()+new Date(req.body.to_date).getFullYear();
    if(selectedDay==today) {
        toDate = new Date().setMinutes(new Date().getMinutes() - 10); // prev 10 minutes
    }
    if(req.body.type=='All') {
        queryParams = {
            store_id: mongoose.Types.ObjectId(req.id), status: 'inactive',
            created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
        };
    }
    else {
        queryParams = {
            store_id: mongoose.Types.ObjectId(req.id), status: 'inactive', "payment_details.name": req.body.type,
            created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
        };
    }
    orderList.aggregate([
        { $match : queryParams },
        { $lookup:
            {
               from: 'customers',
               localField: 'customer_id',
               foreignField: '_id',
               as: 'customerDetails'
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

exports.details = (req, res) => {
	orderList.aggregate([ 
        { $match :
            { store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.query.order_id) }
        },
        { $lookup:
            {
               from: 'customers',
               localField: 'customer_id',
               foreignField: '_id',
               as: 'customerDetails'
            }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            res.json({ status: true, data: response[0] });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.place_inactive_order = (req, res) => {
    orderList.aggregate([ 
        { $match :
            { _id: mongoose.Types.ObjectId(req.body._id), store_id: mongoose.Types.ObjectId(req.id), status: "inactive" }
        },
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
            let orderDetails = response[0];
            let storeDetails = orderDetails.storeDetails[0];
            // invoice number
            let invoiceNum = "";
            if(storeDetails.invoice_status) {
                invoiceNum = commonService.invoiceNumber(storeDetails.invoice_config);
            }
            // clear customer cart
            if(!orderDetails.buy_now) {
                customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(orderDetails.customer_id) }, { $set: { cart_list: [] } }, function(err, response) { });
            }
            // clear guest user cart
            if(orderDetails.order_by=='guest' && orderDetails.guest_email) {
                guestUser.findOneAndUpdate({ email: orderDetails.guest_email }, { $set: { cart_list: [] } }, function(err, response) { });
            }
            // update order status
            orderList.findByIdAndUpdate(orderDetails._id,
            { $set: { invoice_number: invoiceNum, payment_success: true, "payment_details.payment_id": req.body.payment_id, status: "active" } }, function(err, response) {
                if(!err && response)
                {
                    // ERP
                    let erpDetails = storeDetails.erp_details;
                    if(erpDetails && erpDetails.name=='ambar' && erpDetails.status=='active') {
                        if(orderDetails.order_by=='user') {
                            customer.findOne({ _id: mongoose.Types.ObjectId(orderDetails.customer_id), status: 'active' }, function(err, response) {
                                if(!err && response) {
                                    orderDetails.customer_email = response.email;
                                    let erpData = {
                                        erp_config: erpDetails.config,
                                        store_id: storeDetails._id, event_type: 'place_order',
                                        user_agent: req.get('User-Agent'), order_details: orderDetails
                                    }
                                    erpService.ambar(erpData);
                                }
                            });
                        }
                        else if(orderDetails.order_by=='guest' && orderDetails.guest_email) {
                            orderDetails.customer_email = orderDetails.guest_email;
                            let erpData = {
                                erp_config: erpDetails.config,
                                store_id: storeDetails._id, event_type: 'place_order',
                                user_agent: req.get('User-Agent'), order_details: orderDetails
                            }
                            erpService.ambar(erpData);
                        }
                    }
                    // update next invoice no
                    if(invoiceNum) {
                        store.findByIdAndUpdate(storeDetails._id, { $inc: { "invoice_config.next_invoice_no": 1 } }, function(err, response) { });
                    }
                    // decrease product stock
                    stockService.decProductStock(orderDetails.item_list);
                    // decrease coupon balance
                    if(orderDetails.coupon_list.length) { stockService.updateCouponBalance(orderDetails); }
                    // update offer redeem count
                    if(orderDetails.offer_details) { stockService.incOfferRedeemCount(orderDetails.offer_details); }
                    // order placed mail
                    mailService.sendOrderPlacedMail(null, orderDetails._id);
                    // order placed mail to vendor
                    mailService.sendOrderPlacedMailToVendor(orderDetails._id);
                    res.json({ status: true });
                }
                else {
                    res.json({ status: false, message: 'Order Update Failure' });
                }
            });
        }
        else {
            res.json({ status: false, message: 'Invalid Order' });
        }
    });
}

// update order details
exports.update_order = (req, res) => {
    req.body.modified_on = new Date();
    orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
    { $set: req.body }, function(err, response) {
        if(!err) {
            res.json({ status: true });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid order" });
        }
    });
}

// update order status
exports.status_update = (req, res) => {
	orderList.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response) {
            let orderDetails = response;
            // order confirmed
            if(req.body.order_status=='confirmed')
            {
                req.body.confirmed_on = new Date();
                orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                { $set: req.body }, function(err, response) {
                    if(!err) {
                        // send mail
                        mailService.sendOrderConfirmedMail(null, req.body._id).then(result => {
                            let index = orderDetails.item_list.findIndex(object => object.customization_status);
                            if(index!=-1) {
                                // if customization exist
                                mailService.sendCustomizationConfirmationMail(null, req.body._id).then(result => {
                                    res.json({ status: true });
                                }).catch(function(error) {
                                    res.json({ status: false, message: error });
                                });
                            }
                            else {
                                res.json({ status: true });
                            }
                        }).catch(function(error) {
                            res.json({ status: false, message: error });
                        });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Invalid order" });
                    }
                });
            }
            // order dispatched
            else if(req.body.order_status=='dispatched')
            {
                req.body.dispatched_on = new Date();
                orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                { $set: req.body }, function(err, response) {
                    if(!err) {
                        // send mail
                        mailService.sendOrderDispatchedMail(null, req.body._id, null).then(result => {
                            res.json({ status: true });
                        }).catch(function(error) {
                            res.json({ status: false, message: error });
                        });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Invalid order" });
                    }
                });
            }
            // order delivered
            else if(req.body.order_status=='delivered')
            {
                req.body.delivered_on = new Date();
                req.body.payment_success = true;
                orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                { $set: req.body }, function(err, response) {
                    if(!err) {
                        // send mail
                        mailService.sendOrderDeliveredMail(null, req.body._id).then(result => {
                            res.json({ status: true });
                        }).catch(function(error) {
                            res.json({ status: false, message: error });
                        });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Invalid order" });
                    }
                });
            }
            else {
                res.json({ status: false, message: "Invalid status" });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid order" });
        }
    });
}

exports.vendor_order_confirm = (req, res) => {
    storeFeatures.aggregate([
        { $match:
            { store_id: mongoose.Types.ObjectId(req.id), "vendors._id": mongoose.Types.ObjectId(req.body.vendor_id) }
        },
        { $lookup:
            {
               from: 'stores',
               localField: 'store_id',
               foreignField: '_id',
               as: 'storeDetails'
            }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let storeDetails = response[0].storeDetails[0];
            let selectedVendor = response[0].vendors.filter(obj => String(obj._id)==String(req.body.vendor_id));
            // update order
            orderList.findOneAndUpdate({
                store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id),
                "vendor_list.vendor_id": mongoose.Types.ObjectId(req.body.vendor_id) 
            },
            { $set: { "vendor_list.$.confirmed_on": new Date(), "vendor_list.$.status": "confirmed" } }, { new: true }, function(err, response) {
                if(!err && response) {
                    let orderDetails = response;
                    let vendorOrderIndex = orderDetails.vendor_list.findIndex(obj => obj.status!='confirmed');
                    mailService.sendVendorConfirmedMail(selectedVendor[0], orderDetails._id).then(result => {
                        if(storeDetails.additional_features.cfm_odr_on_last_vdr_cfm && vendorOrderIndex==-1) {
                            // order confirm
                            orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                            { $set: { order_status: 'confirmed', confirmed_on: new Date() } }, function(err, response) {
                                if(!err) {
                                    // send mail
                                    mailService.sendOrderConfirmedMail(null, orderDetails._id).then(result => {
                                        let index = orderDetails.item_list.findIndex(object => object.customization_status);
                                        if(index!=-1) {
                                            // if customization exist
                                            mailService.sendCustomizationConfirmationMail(null, orderDetails._id).then(result => {
                                                res.json({ status: true });
                                            }).catch(function(error) {
                                                res.json({ status: false, message: error });
                                            });
                                        }
                                        else {
                                            res.json({ status: true });
                                        }
                                    }).catch(function(error) {
                                        res.json({ status: false, message: error });
                                    });
                                }
                                else {
                                    res.json({ status: false, error: err, message: "Invalid order" });
                                }
                            });
                        }
                        else {
                            res.json({ status: true });
                        }
                    }).catch(function(error) {
                        res.json({ status: false, message: error });
                    });
                }
                else {
                    res.json({ status: false, error: err, message: "Invalid order" });
                }
            });
        }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.cancel_order = (req, res) => {
    orderList.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id), status: "active" }, function(err, response) {
        if(!err && response) {
            let orderDetails = response;
            if(orderDetails.order_status!='cancelled')
            {
                // update order status
                orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) },
                { $set: { order_status: 'cancelled', cancelled_on: new Date() } }, function(err, response) {
                    if(!err) {
                        // revert product stock
                        stockService.incProductStock(orderDetails.item_list);
                        // send mail to customer
                        mailService.sendOrderCancelledMail(null, orderDetails._id).then(result => {
                            // send mail to vendor
                            mailService.sendOrderCancelledMailToVendor(orderDetails._id);
                            res.json({ status: true });
                        }).catch(function(error) {
                            res.json({ status: false, message: error });
                        });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Invalid order" });
                    }
                });
            }
            else {
                res.json({ status: true });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid order" });
        }
    });
}

exports.resend_mail = (req, res) => {
    if(req.body.type=='placed')
    {
        mailService.sendOrderPlacedMail(req.body.email, req.body._id).then(result => {
            res.json({ status: true });
        }).catch(function(error) {
            res.json({ status: false, message: error });
        });
    }
    else if(req.body.type=='confirmed')
    {
        mailService.sendOrderConfirmedMail(req.body.email, req.body._id).then(result => {
            res.json({ status: true });
        }).catch(function(error) {
            res.json({ status: false, message: error });
        });
    }
    else if(req.body.type=='dispatched')
    {
        mailService.sendOrderDispatchedMail(req.body.email, req.body._id, null).then(result => {
            res.json({ status: true });
        }).catch(function(error) {
            res.json({ status: false, message: error });
        });
    }
    else if(req.body.type=='delivered')
    {
        mailService.sendOrderDeliveredMail(req.body.email, req.body._id).then(result => {
            res.json({ status: true });
        }).catch(function(error) {
            res.json({ status: false, message: error });
        });
    }
    else if(req.body.type=='review')
    {
        mailService.sendOrderReviewMail(req.body.email, req.body._id).then(result => {
            res.json({ status: true });
        }).catch(function(error) {
            res.json({ status: false, message: error });
        });
    }
    else if(req.body.type=='cancelled')
    {
        mailService.sendOrderCancelledMail(req.body.email, req.body._id).then(result => {
            res.json({ status: true });
        }).catch(function(error) {
            res.json({ status: false, message: error });
        });
    }
    else if(req.body.type=='customization')
    {
        mailService.sendCustomizationConfirmationMail(req.body.email, req.body._id).then(result => {
            res.json({ status: true });
        }).catch(function(error) {
            res.json({ status: false, message: error });
        });
    }
    else if(mongoose.Types.ObjectId.isValid(req.body.type))
    {
        orderList.findOne({
            store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id),
            "item_groups._id": mongoose.Types.ObjectId(req.body.type)
        }, function(err, response) {
            if(!err && response) {
                mailService.sendOrderDispatchedMail(req.body.email, req.body._id, req.body.type).then(result => {
                    res.json({ status: true });
                }).catch(function(error) {
                    res.json({ status: false, message: error });
                });
            }
            else { res.json({ status: false, error: err, message: "Invalid group" }); }
        });
    }
    else {
        res.json({ status: false, message: "Invalid mail type" });
    }
}

// donations
exports.donation_list = (req, res) => {
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    donationList.aggregate([
        { $match : {
            store_id: mongoose.Types.ObjectId(req.id), status: 'active', created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
        } },
        { $lookup:
            {
               from: 'customers',
               localField: 'customer_id',
               foreignField: '_id',
               as: 'customerDetails'
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

// guest orders
exports.guest_order_list = (req, res) => {
    // orderStatus -> placed, confirmed, dispatched, delivered, cancelled
    let orderStatus = req.body.type;
    if(orderStatus=="all") { orderStatus = { $in: [ 'placed', 'confirmed', 'dispatched' ] }; }
    let queryParams = {};
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    if(req.body.guest_email=='all')
    {
        queryParams = {
            store_id: mongoose.Types.ObjectId(req.id), status: 'active', order_by: 'guest',
            order_status: orderStatus, [req.body.date_type]: { $gte: new Date(fromDate), $lt: new Date(toDate) }
        };
    }
    else {
        queryParams = {
            store_id: mongoose.Types.ObjectId(req.id), status: 'active', order_by: 'guest', guest_email: req.body.guest_email, 
            order_status: orderStatus, [req.body.date_type]: { $gte: new Date(fromDate), $lt: new Date(toDate) }
        };
    }
    orderList.aggregate([{ $match : queryParams }], function(err, response) {
        if(!err && response) { res.json({ status: true, list: response }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

// item groups
exports.add_item_group = (req, res) => {
    orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body.order_id) },
    { $push: { item_groups: req.body } }, function(err, response) {
        if(!err) { res.json({ status: true }); }
        else { res.json({ status: false, error: err, message: "Invalid order" }); }
    });
}

exports.update_item_group = (req, res) => {
    if(req.body.dispatched_status) {
        req.body.dispatched_on = new Date();
    }
    orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body.order_id), "item_groups._id": mongoose.Types.ObjectId(req.body._id) },
    { $set: { "item_groups.$": req.body } }, { new: true }, function(err, response) {
        if(!err && response) {
            if(req.body.dispatched_status) {
                let groupItemsCount = 0; let pendingGrpDispatch = false;
                response.item_groups.forEach(obj => {
                    groupItemsCount += obj.items.length
                    if(!obj.dispatched_on) { pendingGrpDispatch = true; }
                });
                if(groupItemsCount===response.item_list.length && !pendingGrpDispatch) {
                    // dispatch completed
                    orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body.order_id) },
                    { $set: { order_status: 'dispatched', dispatched_on: new Date() } }, function(err, response) { });
                }
                mailService.sendOrderDispatchedMail(null, req.body.order_id, req.body._id).then(result => {
                    res.json({ status: true });
                }).catch(function(error) {
                    res.json({ status: false, message: error });
                });
            }
            else {
                res.json({ status: true });
            }
        }
        else { res.json({ status: false, error: err, message: "Invalid order" }); }
    });
}

exports.remove_item_group = (req, res) => {
    orderList.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body.order_id) },
    { $pull: { item_groups: { _id: mongoose.Types.ObjectId(req.body._id) } } }, function(err, response) {
        if(!err) { res.json({ status: true }); }
        else { res.json({ status: false, error: err, message: "Invalid order" }); }
    });
}