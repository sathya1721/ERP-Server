"use strict";
const mongoose = require('mongoose');
const fs = require("fs");
const store = require("../../models/store.model");
const sections = require("../../models/section.model");
const products = require("../../models/product.model");
const archives = require("../../models/archive.model");
const erpService = require("../../../services/erp.service");
const storeService = require("../../../services/store.service");
const imgUploadService = require("../../../services/img_upload.service");

exports.list = (req, res) => {
    let productCount = 0;
    products.aggregate([{ $match: { store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: 'active' } },
    { $count: "product_count" }], function(err, response) {
        if(!err && response[0]) { productCount = response[0].product_count; }
        // product list
        let queryParams = {};
        if(req.body.category_id=='all')
        {
            queryParams = { store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: 'active' };
            if(req.body.from_date && req.body.to_date) {
                let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
                let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
                queryParams = {
                    store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: 'active',
                    created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) }
                };
            }
        }
        else {
            queryParams = { store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: 'active', category_id: { "$in": [ req.body.category_id ] } };
            if(req.body.from_date && req.body.to_date) {
                let fromDate = new Date(req.body.from_date).setHours(0,0,0,0);
                let toDate = new Date(req.body.to_date).setHours(23,59,59,999);
                queryParams = {
                    store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: 'active',
                    created_on: { $gte: new Date(fromDate), $lt: new Date(toDate) },
                    category_id: { "$in": [ req.body.category_id ] }
                };
            }
        }
        if(req.login_type=='vendor' && req.vendor_id) { queryParams.vendor_id = mongoose.Types.ObjectId(req.vendor_id); }
        if(req.body.vendor_id && req.body.vendor_id!='all') { queryParams.vendor_id = mongoose.Types.ObjectId(req.body.vendor_id); }
        products.find(queryParams, function(err, response) {
            if(!err && response) { res.json({ status: true, list: response, product_count: productCount }); }
            else { res.json({ status: false, error: err, message: "failure" }); }
        });
    });
}

exports.multi_list = (req, res) => {
    let prodIds = [];
    if(req.body.ids && req.body.ids.length) {
        req.body.ids.forEach((obj) => {
            prodIds.push(mongoose.Types.ObjectId(obj));
        });
    }
    if(prodIds.length) {
        products.find({ _id: { $in: prodIds }, store_id: mongoose.Types.ObjectId(req.id), status: 'active' }, function(err, response) {
            if(!err && response) {
                res.json({ status: true, list: response });
            }
            else {
                res.json({ status: false, error: err, message: "failure" });
            }
        });
    }
    else {
        res.json({ status: true, list: [] });
    }
}

exports.details = (req, res) => {
    products.findOne({ _id: mongoose.Types.ObjectId(req.params.productId), status: 'active' }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.add = (req, res) => {
    req.body.store_id = req.id;
    req.body.user_agent = req.get('User-Agent');
    if(req.login_type=='vendor' && req.vendor_id) { req.body.vendor_id = req.vendor_id; }
    if(req.body.limited_products) {
        products.aggregate([{ $match: { store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: 'active' } },
        { $count: "product_count" }], function(err, response) {
            if(!err && response[0]) {
                if(req.body.limited_products > response[0].product_count) {
                    addProduct(req.body).then((respData) => { res.json(respData); });
                }
                else {
                    res.json({ status: false, message: "Maximum "+req.body.limited_products+" products only allowed to add" });
                }
            }
            else { res.json({ status: false, error: err, message: "Failure" }); }
        });
    }
    else { addProduct(req.body).then((respData) => { res.json(respData); }); }
}

exports.update = (req, res) => {
    products.findOne({ store_id: mongoose.Types.ObjectId(req.id), sku: req.body.sku, status: 'active', _id: { $ne: mongoose.Types.ObjectId(req.body._id) } }, function(err, response) {
        if(!err && !response)
        {
            products.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
                if(!err && response)
                {
                    req.body.modified_on = new Date();
                    if(req.body.prev_rank < req.body.rank)
                    {
                        // dec rank
                        products.updateMany({
                            store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: "active",
                            _id: { $ne: mongoose.Types.ObjectId(req.body._id) }, rank: { $gt: req.body.prev_rank, $lte : req.body.rank } },
                        { $inc: { "rank": -1 } }, function(err, response) {
                            // update
                            products.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
                                if(!err && response) {
                                    storeService.updateStoreSitemap(req.id);
                                    store.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
                                        if(!err && response) {
                                            // ERP
                                            let erpDetails = response.erp_details;
                                            if(erpDetails && erpDetails.name=='ambar' && erpDetails.status=='active') {
                                                let erpData = {
                                                    erp_config: erpDetails.config,
                                                    store_id: response._id, event_type: 'add_product',
                                                    user_agent: req.get('User-Agent'), product_details: req.body
                                                }
                                                erpService.ambar(erpData).then((respData) => {
                                                    res.json(respData);
                                                });
                                            }
                                            else res.json({ status: true });
                                        }
                                        else { res.json({ status: false, error: err, message: "Store update error" }); }
                                    });
                                }
                                else { res.json({ status: false, error: err, message: "Failure" }); }
                            });
                        });
                    }
                    else if(req.body.prev_rank > req.body.rank)
                    {
                        // inc rank
                        products.updateMany({
                            store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: "active",
                            _id: { $ne: mongoose.Types.ObjectId(req.body._id) }, rank: { $lt: req.body.prev_rank, $gte : req.body.rank }
                        },
                        { $inc: { "rank": 1 } }, function(err, response) {
                            // update
                            products.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
                                if(!err && response) {
                                    storeService.updateStoreSitemap(req.id);
                                    store.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
                                        if(!err && response) {
                                            // ERP
                                            let erpDetails = response.erp_details;
                                            if(erpDetails && erpDetails.name=='ambar' && erpDetails.status=='active') {
                                                let erpData = {
                                                    erp_config: erpDetails.config,
                                                    store_id: response._id, event_type: 'add_product',
                                                    user_agent: req.get('User-Agent'), product_details: req.body
                                                }
                                                erpService.ambar(erpData).then((respData) => {
                                                    res.json(respData);
                                                });
                                            }
                                            else res.json({ status: true });
                                        }
                                        else { res.json({ status: false, error: err, message: "Store update error" }); }
                                    });
                                }
                                else { res.json({ status: false, error: err, message: "Failure" }); }
                            });
                        });
                    }
                    else {
                        // update
                        products.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
                            if(!err && response) {
                                storeService.updateStoreSitemap(req.id);
                                store.findOne({ _id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
                                    if(!err && response) {
                                        // ERP
                                        let erpDetails = response.erp_details;
                                        if(erpDetails && erpDetails.name=='ambar' && erpDetails.status=='active') {
                                            let erpData = {
                                                erp_config: erpDetails.config,
                                                store_id: response._id, event_type: 'add_product',
                                                user_agent: req.get('User-Agent'), product_details: req.body
                                            }
                                            erpService.ambar(erpData).then((respData) => {
                                                res.json(respData);
                                            });
                                        }
                                        else res.json({ status: true });
                                    }
                                    else { res.json({ status: false, error: err, message: "Store update error" }); }
                                });
                            }
                            else { res.json({ status: false, error: err, message: "Failure" }); }
                        });
                    }
                }
                else {
                    res.json({ status: false, error: err, message: "Invalid product" });
                }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Product SKU already exist" });
        }
    });
}

exports.update_images = (req, res) => {
    products.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            req.body.modified_on = new Date();
            let rootPath = 'uploads/'+req.id+'/products';
            // upload images
            MultiFileUpload(req.body.image_list, rootPath).then((imgNameList) => {
                req.body.image_list = imgNameList;
                // video image upload
                if(!req.body.video_details) req.body.video_details = {};
                VideoImageUpload(req.body.video_details, rootPath).then((videoDetails) => {
                    req.body.video_details = videoDetails;
                    // variant image upload
                    VariantFileUpload(req.body.variant_list, rootPath).then((variantList) => {
                        req.body.variant_list = variantList;
                        products.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
                            if(!err && response) { res.json({ status: true }); }
                            else { res.json({ status: false, error: err, message: "Failure" }); }
                        });
                    });
                });
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid product" });
        }
    });
}

exports.update_details = (req, res) => {
    products.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            req.body.modified_on = new Date();
            products.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
                if(!err && response) {
                    storeService.updateStoreSitemap(req.id);
                    res.json({ status: true });
                }
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid product" });
        }
    });
}

exports.soft_remove = (req, res) => {
    products.findOne({ _id: mongoose.Types.ObjectId(req.body._id), status: 'active' }, function(err, response) {
        if(!err && response)
        {
            let imageList = response.image_list;
            let newImgList = [imageList[0]];
            // dec rank
            products.updateMany({
                store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: "active",
                _id: { $ne: mongoose.Types.ObjectId(req.body._id) }, rank: { $gt: req.body.rank }
            },
            { $inc: { "rank": -1 } }, function(err, response) {
                // update
                products.findByIdAndUpdate(req.body._id, { $set: { image_list: newImgList, status: 'inactive', rank: 0 } }, function(err, response) {
                    if(!err && response) {
                        unlinkProductImages(imageList).then((imgNameList) => {
                            storeService.updateStoreSitemap(req.id);
                            res.json({ status: true });
                        });
                    }
                    else { res.json({ status: false, error: err, message: "Failure" }); }
                });
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid Product" });
        }
    });
}

exports.move_to_archive = (req, res) => {
    archives.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body.archive_id), status: "active" }, function(err, response) {
        if(!err && response)
        {
            // dec rank
            products.updateMany({
                store_id: mongoose.Types.ObjectId(req.id), archive_status: false, status: "active",
                _id: { $ne: mongoose.Types.ObjectId(req.body._id) }, rank: { $gt: req.body.rank }
            },
            { $inc: { "rank": -1 } }, function(err, response) {
                // update
                products.findByIdAndUpdate(req.body._id, { $set: { rank: 0, archive_status: true, archive_id: req.body.archive_id } }, function(err, response) {
                    if(!err && response) {
                        storeService.updateStoreSitemap(req.id);
                        res.json({ status: true });
                    }
                    else { res.json({ status: false, error: err, message: "Product update failure" }); }
                });
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid Folder" });
        }
    });  
}

// bulk upload from JSON
exports.addMany = (req, res) => {
    products.insertMany(req.body.product_list, function(err, response) {
        if(!err && response) {
            storeService.updateStoreSitemap(req.id);
            res.json({ status: true });
        }
        else {
            res.json({ status: false, error: err, message: "failure" });
        }
    });
}

function addProduct(productDetails) {
    return new Promise((resolve, reject) => {
        products.findOne({ store_id: mongoose.Types.ObjectId(productDetails.store_id), sku: productDetails.sku, status: 'active' }, function(err, response) {
            if(!err && !response)
            {
                // upload images
                let rootPath = 'uploads/'+productDetails.store_id+'/products';
                MultiFileUpload(productDetails.image_list, rootPath).then((imgNameList) => {
                    productDetails.image_list = imgNameList;
                    // video image upload
                    if(!productDetails.video_details) productDetails.video_details = {};
                    VideoImageUpload(productDetails.video_details, rootPath).then((videoDetails) => {
                        productDetails.video_details = videoDetails;
                        // variant image upload
                        VariantFileUpload(productDetails.variant_list, rootPath).then((variantList) => {
                            productDetails.variant_list = variantList;
                            // inc rank
                            productDetails._id = mongoose.Types.ObjectId();
                            products.updateMany({
                                store_id: mongoose.Types.ObjectId(productDetails.store_id), archive_status: false, status: "active",
                                _id: { $ne: mongoose.Types.ObjectId(productDetails._id) }, rank: { $gte: productDetails.rank }
                            },
                            { $inc: { "rank": 1 } }, function(err, response) {
                                // add
                                products.create(productDetails, function(err, response) {
                                    if(!err && response) {
                                        storeService.updateStoreSitemap(productDetails.store_id);
                                        store.findOne({ _id: mongoose.Types.ObjectId(productDetails.store_id) }, function(err, response) {
                                            if(!err && response) {
                                                // ERP
                                                let erpDetails = response.erp_details;
                                                if(erpDetails && erpDetails.name=='ambar' && erpDetails.status=='active') {
                                                    let erpData = {
                                                        erp_config: erpDetails.config,
                                                        store_id: productDetails.store_id, event_type: 'add_product',
                                                        user_agent: productDetails.user_agent, product_details: productDetails
                                                    }
                                                    erpService.ambar(erpData).then((respData) => {
                                                        resolve(respData);
                                                    });
                                                }
                                                else resolve({ status: true });
                                            }
                                            else { res.json({ status: false, error: err, message: "Store update error" }); }
                                        });
                                    }
                                    else { resolve({ status: false, error: err, message: "Unable to add" }); }
                                });
                            });
                        });
                    });
                });    
            }
            else { resolve({ status: false, error: err, message: "Product SKU already exist" }); }
        });
    });
}

async function MultiFileUpload(imgList, rootPath) {
    let nameList = [];
    for(let i=0; i<imgList.length; i++)
    {
        if(imgList[i].img_change) {
            imgList[i].image = await imgUploadService.singleFileUpload(imgList[i].image, rootPath, true, null);
        }
        nameList.push(imgList[i]);
    }
    return nameList;
}

async function VariantFileUpload(productVariants, rootPath) {
    let variantList = [];
    if(productVariants && productVariants.length) {
        for(let i=0; i<productVariants.length; i++)
        {
            let imgList = productVariants[i].image_list;
            if(!imgList) { imgList = []; }
            if(imgList && imgList.length) {
                for(let j=0; j<imgList.length; j++)
                {
                    if(imgList[j].img_change) {
                        imgList[j].image = await imgUploadService.singleFileUpload(imgList[j].image, rootPath, true, null);
                    }
                    delete imgList[j].img_change;
                }
            }
            productVariants[i].image_list = imgList;
            variantList.push(productVariants[i]);
        }
    }
    return variantList;
}

async function VideoImageUpload(videoDetails, rootPath) {
    if(videoDetails.image && videoDetails.img_change) {
        videoDetails.image = await imgUploadService.singleFileUpload(videoDetails.image, rootPath, true, null);
        return videoDetails;
    }
    else return videoDetails;
}

function unlinkProductImages(imgList) {
    return new Promise((resolve, reject) => {
        for(let i=1; i<imgList.length; i++)
        {
            if(imgList[i].image && imgList[i].image.indexOf('uploads/yourstore/')==-1) {
                fs.unlink(imgList[i].image, function (err) { });
                let smallImg = imgList[i].image.split(".");
                if(smallImg.length>1) fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { });
            }
        }
        resolve(true);
    });
}