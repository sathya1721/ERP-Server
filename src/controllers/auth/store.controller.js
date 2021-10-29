"use strict";
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dateFormat = require('dateformat');
const bcrypt = require("bcrypt-nodejs");
const saltRounds = bcrypt.genSaltSync(10);
const jwtConfig = require('../../../config/jwtsecret');
const setupConfig = require('../../../config/setup.config');
const mailTemp = require('../../../config/mail-templates');
const store = require("../../models/store.model");
const admin = require("../../models/admin.model");
// const storeFeatures = require("../../models/store_features.model");
// const storeProperties = require("../../models/store_properties.model");
// const ysPackages = require("../../models/ys_packages.model");
// const mailService = require("../../../services/mail.service");
// const commonService = require("../../../services/common.service");

// exports.login = (req, res) => {
//     if(req.body.email) {
//         req.body.email = req.body.email.trim();
//         req.body.email = req.body.email.toLowerCase();
//     }
//     // store admin
//     store.findOne({ email: req.body.email, status: "active" }, function(err, response) {
//         if(!err && response) {
//             let storeData = response;
//             storeData.comparePassword(req.body.password, async function(err, isMatch) {
//                 if(!err && isMatch)
//                 {
//                     // JWT Token
//                     const payload = { id: storeData._id, user_type: 'store', login_type: 'admin', session_key: storeData.session_key };
//                     const token = jwt.sign(payload, jwtConfig.jwtSecretKey);
//                     storeProperties.findOne({ store_id: storeData._id }, function(err, response) {
//                         if(!err && response) {
//                             storeData.login_id = storeData._id;
//                             res.json({ status: true, token: token, login_type: 'admin', data: storeData, store_permissions: response });
//                         }
//                         else {
//                             res.json({ status: false, error: err, message: "Invalid user" });
//                         }
//                     });
//                 }
//                 else {
//                     res.json({ status: false, error: err, message: "Password does not match" });
//                 }
//             });
//         }
//         else {
//             // sub user
//             storeFeatures.findOne({ "sub_users.email": req.body.email, "sub_users.status": "active" }, function(err, response) {
//                 if(!err && response) {
//                     let storeId = response.store_id;
//                     let subUserList = response.sub_users;
//                     let index = subUserList.findIndex(obj => obj.email==req.body.email && obj.status=="active");
//                     let subUser = subUserList[index];
//                     bcrypt.compare(req.body.password, subUser.password, function(err, isMatch) {
//                         if(!err && isMatch)
//                         {
//                             // pending update device token for sub-user
//                             // JWT Token
//                             const payload = { id: storeId, user_type: 'store', login_type: 'subuser', subuser_id: subUser._id, session_key: subUser.session_key };
//                             const token = jwt.sign(payload, jwtConfig.jwtSecretKey);
//                             store.aggregate([
//                                 { $match: {  _id: mongoose.Types.ObjectId(storeId), status: "active" } },
//                                 {
//                                     $lookup: {
//                                         from: "store_permissions",
//                                         localField: "_id",
//                                         foreignField: "store_id",
//                                         as: "permissions"
//                                     }
//                                 }
//                             ], function(err, response) {
//                                 if(!err && response[0])
//                                 {
//                                     let storePermission = response[0].permissions[0];
//                                     let storeDetails = response[0];
//                                     storeDetails.permissions = [];
//                                     storeDetails.login_id = subUser._id;
//                                     res.json({ status: true, token: token, login_type: 'subuser', data: storeDetails, store_permissions: storePermission, subuser_permissions: subUser.permissions });
//                                 }
//                                 else {
//                                     res.json({ status: false, error: err, message: "Invalid user" });
//                                 }
//                             });
//                         }
//                         else {
//                             res.json({ status: false, error: err, message: "Password does not match" });
//                         }
//                     });
//                 }
//                 else {
//                     // vendor
//                     storeFeatures.findOne({ "vendors.email": req.body.email, "vendors.status": "active" }, function(err, response) {
//                         if(!err && response) {
//                             let storeId = response.store_id;
//                             let vendorsList = response.vendors;
//                             let index = vendorsList.findIndex(obj => obj.email==req.body.email && obj.status=="active");
//                             let vendor = vendorsList[index];
//                             bcrypt.compare(req.body.password, vendor.password, function(err, isMatch) {
//                                 if(!err && isMatch)
//                                 {
//                                     // pending update device token for vendor
//                                     // JWT Token
//                                     const payload = { id: storeId, user_type: 'store', login_type: 'vendor', vendor_id: vendor._id, session_key: vendor.session_key };
//                                     const token = jwt.sign(payload, jwtConfig.jwtSecretKey);
//                                     store.aggregate([
//                                         { $match: {  _id: mongoose.Types.ObjectId(storeId), status: "active" } },
//                                         {
//                                             $lookup: {
//                                                 from: "store_permissions",
//                                                 localField: "_id",
//                                                 foreignField: "store_id",
//                                                 as: "permissions"
//                                             }
//                                         }
//                                     ], function(err, response) {
//                                         if(!err && response[0])
//                                         {
//                                             let storePermission = response[0].permissions[0];
//                                             let storeDetails = response[0];
//                                             storeDetails.permissions = [];
//                                             storeDetails.login_id = vendor._id;
//                                             res.json({ status: true, token: token, login_type: 'vendor', data: storeDetails, store_permissions: storePermission, vendor_permissions: vendor.permissions });
//                                         }
//                                         else {
//                                             res.json({ status: false, error: err, message: "Invalid user" });
//                                         }
//                                     });
//                                 }
//                                 else {
//                                     res.json({ status: false, error: err, message: "Password does not match" });
//                                 }
//                             });
//                         }
//                         else {
//                             res.json({ status: false, error: null, message: "Invalid user" });
//                         }
//                     });
//                 }
//             });
//         }
//     });
// }

exports.login_v2 = (req, res) => {
    if(req.body.email) {
        req.body.email = req.body.email.trim();
        req.body.email = req.body.email.toLowerCase();
    }
    // store admin
    store.aggregate([
        { $match: { email: req.body.email } },
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
            bcrypt.compare(req.body.password, storeData.password, function(err, isMatch) {
                if(!err && isMatch)
                {
                    // JWT Token
                    const payload = { id: storeData._id, user_type: 'store', login_type: 'admin', session_key: storeData.session_key };
                    const token = jwt.sign(payload, jwtConfig.jwtSecretKey);
                    if(storeData.status=='active') {
                        res.json({ status: true, token: token, login_type: 'store', data: storeData, ys_features: [], subuser_features: [] });
                    }
                    else {
                        res.json({ status: true, token: token, login_type: 'admin', data: storeData, ys_features: [], subuser_features: [] });
                    }
                }
                else {
                    res.json({ status: false, error: err, message: "Password does not match" });
                }
            });
        }
        else {
            // sub user
            storeFeatures.findOne({ "sub_users.email": req.body.email, "sub_users.status": "active" }, function(err, response) {
                if(!err && response) {
                    let storeId = response.store_id;
                    let subUserList = response.sub_users;
                    let index = subUserList.findIndex(obj => obj.email==req.body.email && obj.status=="active");
                    let subUser = subUserList[index];
                    bcrypt.compare(req.body.password, subUser.password, function(err, isMatch) {
                        if(!err && isMatch)
                        {
                            // pending update device token for sub-user
                            // JWT Token
                            const payload = { id: storeId, user_type: 'store', login_type: 'subuser', subuser_id: subUser._id, session_key: subUser.session_key };
                            const token = jwt.sign(payload, jwtConfig.jwtSecretKey);
                            store.aggregate([
                                { $match: { _id: mongoose.Types.ObjectId(storeId), status: "active" } },
                                {
                                    $lookup: {
                                        from: "deploy_details",
                                        localField: "_id",
                                        foreignField: "store_id",
                                        as: "deployDetails"
                                    }
                                }
                            ], function(err, response) {
                                if(!err && response[0])
                                {
                                    let storeData = response[0];
                                    ysPackages.aggregate([
                                        { $match: {  _id: mongoose.Types.ObjectId(storeData.package_details.package_id), status: "active" } },
                                        {
                                            $lookup: {
                                                from: "ys_features",
                                                localField: "_id",
                                                foreignField: "linked_packages.package_id",
                                                as: "ys_features"
                                            }
                                        }
                                    ], function(err, response) {
                                        if(!err && response[0])
                                        {
                                            let currIndex = storeData.currency_types.findIndex(obj => obj.default_currency);
                                            let defaultCurrency = storeData.currency_types[currIndex];
                                            let featureList = storeData.package_details.paid_features;
                                            let packageData = response[0];
                                            if(packageData.trial_status) {
                                                let trialEndData = new Date(storeData.created_on).setDate(new Date(storeData.created_on).getDate() + parseFloat(packageData.trial_upto_in_days));
                                                if(new Date(trialEndData).setHours(23,59,59,999) > new Date().setHours(23,59,59,999)) {
                                                    packageData.trial_features.forEach(element => { featureList.push(element); });
                                                }
                                            }
                                            packageData.ys_features.filter(fea => fea.status=='active').forEach(element => {
                                                let packIndex = element.linked_packages.findIndex(obj => obj.package_id.toString()==storeData.package_details.package_id);
                                                if(packIndex!=-1) {
                                                    element.package_pricing = element.linked_packages[packIndex].currency_types;
                                                    if(element.package_pricing && element.package_pricing[defaultCurrency.country_code] && element.package_pricing[defaultCurrency.country_code].price === 0) featureList.push(element.keyword);
                                                }
                                            });
                                            res.json({ status: true, token: token, login_type: 'subuser', data: storeData, ys_features: featureList, subuser_features: subUser.permission_list });
                                        }
                                        else {
                                            res.json({ status: false, error: err, message: "Invalid package" });
                                        }
                                    });
                                }
                                else {
                                    res.json({ status: false, error: err, message: "Account expired" });
                                }
                            });
                        }
                        else {
                            res.json({ status: false, error: err, message: "Password does not match" });
                        }
                    });
                }
                else {
                    res.json({ status: false, error: null, message: "Invalid user" });
                }
            });
        }
    });
}

