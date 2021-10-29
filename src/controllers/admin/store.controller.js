"use strict";
const fs = require("fs");
const request = require('request');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt-nodejs");
const saltRounds = bcrypt.genSaltSync(10);

const store = require("../../models/store.model");
const admin = require("../../models/admin.model");
// const storeProperties = require("../../models/store_properties.model");
// const storeFeatures = require("../../models/store_features.model");
// const ysPackages = require("../../models/ys_packages.model");

const jwtConfig = require('../../../config/jwtsecret');
const defaultSetup = require('../../../config/default.setup');
const setupConfig = require("../../../config/setup.config");
// const storeService = require("../../../services/store.service");

exports.list = (req, res) => {
    let statusType = "active";
    if(req.query.type) { statusType = req.query.type; }
    store.find({ status: statusType }, { payment_types: 0, mail_config: 0 }, function(err, response) {
        if(!err && response) { res.json({ status: true, list: response }); }
        else { res.json({ status: false, error: err, message: "Invalid user" }); }
    });
}

exports.details = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "Invalid user" }); }
    });
}

exports.add = (req, res) => {
    if(req.body.email) {
        req.body.email = req.body.email.trim();
        req.body.email = req.body.email.toLowerCase();
    }

    store.findOne({ email: req.body.email, website: req.body.website }, function(err, response) {
        if(!err && !response) {
            req.body._id = mongoose.Types.ObjectId();
            // logo
            if(!req.body.store_logo) { req.body.store_logo = defaultSetup.logo; }
            let formData = { image: req.body.store_logo, store_id: req.body._id.toString() };
            // default currency
            // if(req.body.currency_types) {
            //     req.body.currency_types.default_currency = true;
            //     req.body.currency_types = [req.body.currency_types];
            // }
            request.post({ url: setupConfig.image_api_base+'/logo_upload', form: formData }, function (err, response, body) {
                if(!err && body) {
                    req.body.session_key = new Date().valueOf();
                    req.body.base_url = 'https://'+req.body.website;
                    req.body.seo_details = { page_title: req.body.name, meta_desc: "Dinamic ERP" };
                    let newStore = new store(req.body);
                    // store
                    newStore.save(function(err, response) {
                        if(!err && response)
                        {
                            // let storeDetails = response;
                            res.json({ status: true, data : response });
                        
                        }
                        else { 
                            console.log(err);
                            res.json({ status: false, error: err, message: "Unable to register" }); 
                        }
                    });
                }
                else { res.json(err); }
            });

        }
        else { res.json({ status: false, error: err, message: "Email or website already exist" }); }
    });
}

exports.update = (req, res) => {
    store.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
        if(!err && response) { res.json({ status: true }); }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

exports.hard_remove = (req, res) => {
    storeService.deleteStorePermanently(req.body._id).then((respData) => {
        if(respData) {
            fs.rmdirSync('uploads/'+req.body._id, { recursive: true });
            res.json({ status: true });
        }
        else { res.json({ status: false, message: "Invalid store" }); }
    });
}

exports.generate_token = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.body.store_id), status: "active" }, function(err, response) {
        if(!err && response) {
            let storeData = response;
            // JWT Token
            const payload = { id: storeData._id, user_type: 'store', login_type: 'admin', session_key: storeData.session_key };
            const token = jwt.sign(payload, jwtConfig.jwtSecretKey);
            storeProperties.findOne({ store_id: storeData._id }, function(err, response) {
                if(!err && response) {
                    storeData.login_id = storeData._id;
                    res.json({ status: true, token: token, login_type: 'admin', data: storeData, store_permissions: response });
                }
                else {
                    res.json({ status: false, error: err, message: "Invalid user" });
                }
            });
        }
        else {
            res.json({ status: false, error: null, message: "Invalid store" });
        }
    });
}

exports.generate_token_v2 = (req, res) => {
    store.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(req.body.store_id), status: "active" } },
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
            // JWT Token
            const payload = { id: storeData._id, user_type: 'store', login_type: 'admin', session_key: storeData.session_key };
            const token = jwt.sign(payload, jwtConfig.jwtSecretKey);
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
                    res.json({ status: true, token: token, login_type: 'admin', data: storeData, ys_features: featureList });
                }
                else {
                    res.json({ status: false, error: err, message: "Invalid package" });
                }
            });
        }
        else {
            res.json({ status: false, error: null, message: "Invalid store" });
        }
    });
}

exports.change_pwd = (req, res) => {
    let newPwd = bcrypt.hashSync(req.body.new_pwd, saltRounds);
    let sessionKey = new Date().valueOf();
    store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.store_id) },
    { $set: { password: newPwd, temp_token: null, session_key: sessionKey } }, function(err, response) {
        if(!err && response) {
            res.json({ status: true });
        }
        else {
            res.json({ status: false, error: err, message: "Unable to update pwd" });
        }
    });
}

exports.manual_deploy = (req, res) => {
    if(mongoose.Types.ObjectId.isValid(req.query.store_id) && req.query.store_id) {
        store.findOne({ _id: mongoose.Types.ObjectId(req.query.store_id), status: "active" }, function(err, response) {
            if(!err && response) {
                let storeDetails = response;
                if(storeDetails.build_details && !storeDetails.build_details.port_number && !storeDetails.build_details.build_number) {
                    admin.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
                        if(!err && response) {
                            let adminDetails = response;
                            if(adminDetails.auto_deploy) {
                                // update next port number
                                admin.updateMany({ _id: mongoose.Types.ObjectId(adminDetails._id) }, { $inc: { next_port: 1 } }, function(err, response) { });
                                // auto-deploy
                                const options = {
                                    url: 'http://admin:117e1bb46d62de4d1249591b720f47f0da@fiscy.com:8081/job/Yourstore-Pipe/buildWithParameters?website='+storeDetails.website+'&port='+adminDetails.next_port+'&store_id='+storeDetails._id,
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: { token: '&bnXrQ5$f-e2VbAYHze%urmM!F$@nnrV' },
                                    json: true
                                };
                                request(options, function(err, response, body) {
                                    store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(storeDetails._id) },
                                    { $set: { "build_details.port_number": adminDetails.next_port } }, function(err, response) {
                                        res.json({ status: true });
                                    });
                                });
                            }
                            else { res.json({ status: false, message: "Auto-Deployment was temporarily disabled" }); }
                        }
                        else { res.json({ status: false, message: "Invalid login" }); }
                    });
                }
                else { res.json({ status: false, message: "Deployment was done. Please check the build status" }); } 
            }
            else { res.json({ status: false, error: null, message: "Invalid store" }); }
        });
    }
    else { res.json({ status: false, message: "Invalid store ID" }); }
}

exports.check_build_status = (req, res) => {
    if(mongoose.Types.ObjectId.isValid(req.query.store_id) && req.query.store_id) {
        store.findOne({ _id: mongoose.Types.ObjectId(req.query.store_id), status: "active" }, function(err, response) {
            if(!err && response) {
                let storeDetails = response;
                if(storeDetails.build_details && storeDetails.build_details.build_number) {
                    const options = {
                        url: 'http://admin:117e1bb46d62de4d1249591b720f47f0da@fiscy.com:8081/job/Yourstore-Pipe/'+storeDetails.build_details.build_number+'/api/json',
                        method: 'GET'
                    };
                    request(options, function(err, response, body) {
                        if(!err && response.statusCode == 200) {
                            let jsonData = JSON.parse(body);
                            store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(storeDetails._id) },
                            { $set: { "build_details.build_status": jsonData.result } }, function(err, response) {
                                if(!err && response) { res.json({ status: true }); }
                                else { res.json({ status: false, error: err, message: "Unable to update" }); }
                            });
                        }
                        else { res.json({ status: false, message: "Invalid build number" }); }
                    });
                }
                else { res.json({ status: false, message: "Build number doesn't exists" }); }
            }
            else { res.json({ status: false, error: null, message: "Invalid store" }); }
        });
    }
    else { res.json({ status: false, message: "Invalid store ID" }); }
}