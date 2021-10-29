"use strict";
const mongoose = require('mongoose');
const store = require("../../models/store.model");
const admin = require("../../models/admin.model");
const ysPackages = require("../../models/ys_packages.model");
const storeFeatures = require("../../models/store_features.model");
const createPayment = require("../../../services/create_payment.service");
const commonService = require("../../../services/common.service");
const storeService = require("../../../services/store.service");

exports.create_store = (req, res) => {
    if(req.body.email) {
        req.body.email = req.body.email.trim();
        req.body.email = req.body.email.toLowerCase();
    }
    req.body.package_details = { package_id: "5f4cd235573e9a1e680239fd" };
    store.findOne({ email: req.body.email }, function(err, response) {
        if(!err && !response) {
            storeFeatures.findOne({ $or: [ { "sub_users.email": req.body.email }, { "vendors.email": req.body.email } ] }, function(err, response) {
                if(!err && !response) {
                    // package details
                    ysPackages.findOne({ _id: mongoose.Types.ObjectId(req.body.package_details.package_id), status: "active" }, function(err, response) {
                        if(!err && response) {
                            admin.findOne({}, function(err, response) {
                                if(!err && response) {
                                    let adminDetails = response;
                                    // default currency
                                    if(req.body.currency_types) {
                                        req.body.currency_types.default_currency = true;
                                        req.body.currency_types = [req.body.currency_types];
                                    }
                                    req.body.type = "order_based";
                                    req.body.account_type = "client";
                                    req.body.status = "active";
                                    req.body.session_key = new Date().valueOf();
                                    req.body.temp_token = commonService.randomString(4)+new Date().valueOf()+commonService.randomString(4);
                                    req.body.seo_details = { page_title: req.body.name, meta_desc: req.body.description.substring(0, 70) };
                                    req.body.payment_types = [{
                                        name: "COD", btn_name: "Cash on Delivery", rank: 1,
                                        cod_config: { cod_charges: 0, max_amount: 0, sms_status: false }
                                    }];
                                    let newStore = new store(req.body);
                                    // store
                                    newStore.save(function(err, response) {
                                        if(!err && response) {
                                            storeService.create_store_v2(response, adminDetails).then((respData) => {
                                                res.json(respData);
                                            }).catch((errData) => { res.json(errData); });
                                        }
                                        else {
                                            res.json({ status: false, error: err, message: "Unable to register" });
                                        }
                                    });
                                }
                                else { res.json({ status: false, error: err, message: "Invalid user" }); }
                            });
                        }
                        else { res.json({ status: false, error: err, message: "Invalid package" }); }
                    });
                }
                else { res.json({ status: false, error: err, message: "Email already exists" }); }
            });
        }
        else { res.json({ status: false, error: err, message: "Email already exists" }); }
    });
}