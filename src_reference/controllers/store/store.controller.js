"use strict";
const mongoose = require('mongoose');
const request = require('request');
const bcrypt = require("bcrypt-nodejs");
const saltRounds = bcrypt.genSaltSync(10);
const store = require("../../models/store.model");
const feedback = require("../../models/feedback.model");
const nlSubscribers = require("../../models/newsletter.model");
const orderList = require("../../models/order_list.model");
const product = require("../../models/product.model");
const customer = require("../../models/customer.model");
const ysPackages = require("../../models/ys_packages.model");
const storeFeatures = require("../../models/store_features.model");
const storeProperties = require("../../models/store_properties.model");
const imgUploadService = require("../../../services/img_upload.service");

exports.details = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.adv_details = (req, res) => {
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
            if(storeData.status=='active') {
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
                        res.json({ status: true, data: storeData, ys_features: featureList });
                    }
                    else { res.json({ status: false, error: err, message: "Invalid package" }); }
                });
            }
            else { res.json({ status: true, data: storeData, ys_features: [] }); }
        }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.update = (req, res) => {
    store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) },
    { $set: req.body }, { new: true }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "Update Failure" }); }
    });
}

exports.prop_details = (req, res) => {
    storeProperties.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.update_prop = (req, res) => {
    let newsletterConfig = req.body['application_setting.newsletter_config'];
    if(newsletterConfig && newsletterConfig.img_change) {
        let rootPath = 'uploads/'+req.id+'/layouts';
        imgUploadService.singleFileUpload(newsletterConfig.image, rootPath, true, null).then((img) => {
            req.body['application_setting.newsletter_config'].image = img;
            storeProperties.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
            { $set: req.body }, { new: true }, function(err, response) {
                if(!err && response) { res.json({ status: true, data: response }); }
                else { res.json({ status: false, error: err, message: "Update Failure" }); }
            });
        });
    }
    else {
        storeProperties.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
        { $set: req.body }, { new: true }, function(err, response) {
            if(!err && response) { res.json({ status: true, data: response }); }
            else { res.json({ status: false, error: err, message: "Update Failure" }); }
        });
    }
}

exports.feedback = (req, res) => {
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    feedback.aggregate([
        { $match:
            { store_id: mongoose.Types.ObjectId(req.id), created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) } }
        },
        { $lookup: 
            { from: "customers", localField: "customer_id", foreignField: "_id", as: "customer_details" }
        }
    ], function(err, response) {
        if(!err && response) { res.json({ status: true, list: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.courier_partners = (req, res) => {
    storeFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, list: response.courier_partners }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.newsletter_subscribers = (req, res) => {
    nlSubscribers.find({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, list: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.dashboard = (req, res) => {
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    let details = { order_list: [], products: 0 };
    // order list
    orderList.aggregate([
        {
            $match: {
                store_id: mongoose.Types.ObjectId(req.id), status: "active", created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
            }
        },
        { $project : { order_status : 1 , created_on : 1, status: 1, store_id: 1, final_price: 1 } }
    ], function(err, response) {
        if(!err && response) { details.order_list = response; }
        // products
        product.aggregate([
            {
                $match: {
                    store_id: mongoose.Types.ObjectId(req.id), status: "active", created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
                }
            },
            { $count: "total_products" }
        ], function(err, response) {
            if(!err && response[0]) { details.products = response[0].total_products; }
            res.json({ status: true, data: details });
        });
    });
}

exports.dashboard_customers = (req, res) => {
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    let details = { top_customers: [], total_customers: 0, abandoned_count: 0 };
    orderList.aggregate([
        {
            $match: {
                store_id: mongoose.Types.ObjectId(req.id), status: "active", order_status: { $ne: 'cancelled' },
                order_by: { $ne: 'guest' }, created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
            },
        },
        {
            $group : {
                _id : "$customer_id",
                totalSaleAmount: { $sum: "$final_price" },
                order_list: { 
                    $push: { order_id: "$_id", item_list: "$item_list", final_price: "$final_price" }
                }
            }
        },
        { $sort : { totalSaleAmount: -1 } },
        { $limit : req.body.limit },
        { 
            $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customerDetails" }
        }
    ], function(err, response) {
        if(!err && response) { details.top_customers = response; }
         // customers
        customer.aggregate([
            {
                $match: {
                    store_id: mongoose.Types.ObjectId(req.id), status: "active", created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
                }
            },
            { $count: "total_customers" }
        ], function(err, response) {
            if(!err && response[0]) { details.total_customers = response[0].total_customers; }
            // abandoned count
            let abandonedDate = toDate;
            let currentEndDate = new Date().setHours(23,59,59,999);
            if(currentEndDate==toDate) abandonedDate = new Date().setHours(new Date().getHours() - 1);
            customer.aggregate([
                { 
                    $match: {
                        store_id: mongoose.Types.ObjectId(req.id), status: 'active', 'cart_list.0': { $exists: true },
                        cart_updated_on: { $gte: new Date(fromDate), $lte: new Date(abandonedDate) }
                    }
                },
                { $count: "abandoned_count" }
            ], function(err, response) {
                if(!err && response[0]) { details.abandoned_count = response[0].abandoned_count; }
                res.json({ status: true, data: details });
            });
        });
    });
}

exports.vendor_dashboard = (req, res) => {
    let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
    let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
    let details = { order_list: [], products: 0, vendor_products: 0 };
    // order list
    orderList.aggregate([
        {
            $match: {
                store_id: mongoose.Types.ObjectId(req.id), status: "active", "vendor_list.vendor_id": mongoose.Types.ObjectId(req.body.vendor_id), created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
            }
        },
        { $project : { order_status : 1 , created_on : 1, status: 1, store_id: 1, final_price: 1, item_list: 1, vendor_list: 1 } }
    ], function(err, response) {
        if(!err && response) { details.order_list = response; }
        // products
        product.aggregate([
            {
                $match: {
                    store_id: mongoose.Types.ObjectId(req.id), status: "active", vendor_id: mongoose.Types.ObjectId(req.body.vendor_id), created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
                }
            },
            { $count: "total_products" }
        ], function(err, response) {
            if(!err && response[0]) { details.products = response[0].total_products; }
            // vendor products
            product.aggregate([
                {
                    $match: {
                        store_id: mongoose.Types.ObjectId(req.id), status: "active", vendor_id: mongoose.Types.ObjectId(req.body.vendor_id)
                    }
                },
                { $count: "vendor_products" }
            ], function(err, response) {
                if(!err && response[0]) { details.vendor_products = response[0].vendor_products; }
                res.json({ status: true, data: details });
            });
        });
    });
}

exports.change_pwd = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.id), status: 'active' }, function(err, response) {
        if(!err && response) {
            response.comparePassword(req.body.current_pwd, async function(err, isMatch) {
                if(!err && isMatch) {
                    let newPwd = bcrypt.hashSync(req.body.new_pwd, saltRounds);
                    let sessionKey = new Date().valueOf();
                    store.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) },
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

exports.update_logo = (req, res) => {
    imgUploadService.singleFileUpload(req.body.image, req.body.root_path, req.body.small_image, req.body.file_name).then((fileName) => {
        if(fileName) { res.json({ status: true }); }
        else { res.json({ status: false, message: "Image not exist" }); }
    });
}

exports.create_ssl = (req, res) => {
    store.findOne({ _id: mongoose.Types.ObjectId(req.id), status: "active" }, function(err, response) {
        if(!err && response) {
            let storeDetails = response;
            if(storeDetails.build_details && storeDetails.build_details.build_status=='success' && storeDetails.build_details.ssl_status!='success') {
                // create ssl
                const options = {
                    url: 'http://admin:117e1bb46d62de4d1249591b720f47f0da@fiscy.com:8081/job/Yourstore-SSL/buildWithParameters?website='+storeDetails.website,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: { token: '&bnXrQ5$f-e2VbAYHze%urmM!F$@nnrV' },
                    json: true
                };
                request(options, function(err, response, body) {
                    res.json({ status: true });
                });
            }
            else { res.json({ status: false, message: "Build was not completed or SSL already created" }); }
        }
        else { res.json({ status: false, error: null, message: "Invalid user" }); }
    });
}