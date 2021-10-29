"use strict";
const mongoose = require('mongoose');
const request = require('request');
const urlencode = require('urlencode');
const bcrypt = require("bcrypt-nodejs");
const saltRounds = bcrypt.genSaltSync(10);
const store = require("../../models/store.model");
const product = require("../../models/product.model");
const customer = require("../../models/customer.model");
const feedback = require("../../models/feedback.model");
const commonService = require("../../../services/common.service");

exports.details = (req, res) => {
    customer.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, data: response });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.update = (req, res) => {
    if(req.body.name) { req.body.name = commonService.stringCapitalize(req.body.name); }
    customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) },
    { $set: req.body }, { new: true }, function(err, response) {
        if(!err && response) {
            res.json({ status: true, data: response });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.update_mobile = (req, res) => {
    if(req.body.mobile) { req.body.mobile = req.body.mobile.trim(); }
    customer.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) {
            let customerData = response;
            customer.findOne({
                store_id: mongoose.Types.ObjectId(customerData.store_id), mobile: req.body.mobile, _id: { $ne: mongoose.Types.ObjectId(customerData._id) }
            }, function(err, response) {
                if(!err && response) {
                    res.json({ status: false, message: "Mobile already exists" });
                }
                else {
                    customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) },
                    { $set: req.body }, { new: true }, function(err, response) {
                        if(!err && response) {
                            res.json({ status: true, data: response });
                        }
                        else {
                            res.json({ status: false, error: err, message: "Failure" });
                        }
                    });
                }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid User" });
        }
    });
}

exports.change_pwd = (req, res) => {
    customer.findOne({ _id: mongoose.Types.ObjectId(req.id), status: 'active' }, function(err, response) {
        if(!err && response) {
            response.comparePassword(req.body.current_pwd, async function(err, isMatch) {
                if(!err && isMatch) {
                    let sessionKey = new Date().valueOf();
                    let newPwd = bcrypt.hashSync(req.body.new_pwd, saltRounds);
                    customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) },
                    { $set: { password: newPwd, session_key: sessionKey } }, function(err, response) {
                        if(!err) {
                            res.json({ status: true });
                        }
                        else {
                            res.json({ status: false, error: err, message: "Failure" });
                        }
                    });
                }
                else {
                    res.json({ status: false, error: err, message: "Incorrect Password" });
                }
            });
        } else {
            res.json({ status: false, error: err, message: "Invalid user" });
        }
    });
};

exports.feedback = (req, res) => {
    req.body.customer_id = req.id;
    feedback.create(req.body, function(err, response) {
        if(!err && response) { res.json({ status: true }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
};

// OTP
exports.generate_otp = (req, res) => {
    if(req.body.mobile) { req.body.mobile = req.body.mobile.trim(); }
    customer.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) {
            let customerData = response;
            customer.findOne({
                store_id: mongoose.Types.ObjectId(customerData.store_id), mobile: req.body.mobile, _id: { $ne: mongoose.Types.ObjectId(customerData._id) }
            }, function(err, response) {
                if(!err && response) {
                    res.json({ status: false, message: "Mobile already exists" });
                }
                else {
                    store.findOne({ _id: mongoose.Types.ObjectId(customerData.store_id) }, function(err, response) {
                        if(!err && response) {
                            let storeDetails = response;
                            let otpData = {otp: Math.floor(100000+Math.random()*999999), otp_request_on: new Date() };
                            customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) }, { $set: otpData }, function(err, response) {
                                if(!err && response) {
                                    let smsConfig = storeDetails.sms_config;
                                    if(smsConfig && smsConfig.provider=='24x7SMS') {
                                        let mobileNo = req.body.dial_code+req.body.mobile;
                                        let msgContent = smsConfig.msg_content.replace(/#OTP#/g, otpData.otp);
                                        let smsOptions = {
                                            method: 'get',
                                            url: 'https://smsapi.24x7sms.com/api_2.0/SendSMS.aspx?APIKEY='+smsConfig.api_key+'&MobileNo='+mobileNo+'&SenderID='+smsConfig.sender_id+'&Message='+urlencode(msgContent)+'&ServiceName='+smsConfig.service_name+'&DLTTemplateID='+smsConfig.template_id,
                                        };
                                        request(smsOptions, function (err, response) {
                                            if(!err && response.statusCode == 200) {
                                                if(response.body.indexOf('success')!=-1) {
                                                    res.json({ status: true });
                                                }
                                                else { res.json({ status: false, error: response.body, message: "Unable to send SMS" }); }
                                            }
                                            else { res.json({ status: false, error: err, message: "SMS gateway error" }); }
                                        });
                                    }
                                    else {
                                        res.json({ status: false, message: "Invalid SMS provider" });
                                    }
                                }
                                else {
                                    res.json({ status: false, error: err, message: "Update failure" });
                                }
                            });
                        }
                        else {
                            res.json({ status: false, error: err, message: "Invalid Store" });
                        }
                    });
                }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid User" });
        }
    });
}

exports.validate_otp = (req, res) => {
    customer.findOne({ _id: mongoose.Types.ObjectId(req.id), otp: req.body.otp }, function(err, response) {
        if(!err && response) {
            let customerData = response;
            // duration validation 15 minutes
            let timeStamp = ((customerData.otp_request_on).getTime() + (15*60000));
            let currentTime = new Date().valueOf();
            if(timeStamp > currentTime) { res.json({ status: true }); }
            else { res.json({ status: false, message: "OTP was expired" }); }
        }
        else { res.json({ status: false, error: err, message: "Invalid OTP" }); }
    });
}

// update wish list
exports.update_wish_list = (req, res) => {
    customer.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) {
            processWishList(response.wish_list).then((updatedWishList) => {
                customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) },
                { $set: { wish_list: updatedWishList } }, { new: true }, function(err, response) {
                    if(!err && response) {
                        res.json({ status: true, data: response });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Failure" });
                    }
                });
            });
        } else {
            res.json({ status: false, message: "Invalid store" });
        }
    });
}

async function processWishList(wishList) {
    let updatedWishList = [];
    for(let i=0; i<wishList.length; i++)
    {
        // check product is valid, and update product details
        let updatedProduct = await getWishProductDetails(wishList[i]);
        // if valid
        if(updatedProduct) updatedWishList.push(updatedProduct);
    }
    return updatedWishList;
}

function getWishProductDetails(productDetails) {
    return new Promise((resolve, reject) => {
        product.findOne({ _id: mongoose.Types.ObjectId(productDetails.product_id), status: "active", archive_status: false }, function(err, response) {
            if(!err && response) {
                productDetails.sku = response.sku;
                productDetails.name = response.name;
                productDetails.selling_price = response.selling_price;
                productDetails.disc_status = response.disc_status;
                productDetails.disc_percentage = response.disc_percentage;
                productDetails.discounted_price = response.discounted_price;
                productDetails.image = response.image_list[0].image;
                productDetails.seo_status = response.seo_status;
                productDetails.seo_details = response.seo_details;
                if(response.hsn_code) { productDetails.hsn_code = response.hsn_code; }
                resolve(productDetails);
            }
            else resolve(null);
        });
    });
}