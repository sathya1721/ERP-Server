"use strict";
const mongoose = require('mongoose');
const productFeatures = require("../../models/product_features.model");
const imgUploadService = require("../../../services/img_upload.service");

exports.list = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, list: response.addon_list.filter(obj => obj.status=="active") }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.add = (req, res) => {
	productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response)
        {
            let addonList = response.addon_list;
            let index = addonList.findIndex(object => object.name==req.body.name && object.status=="active");
            if(index==-1)
            {
                // inc rank
                addonList.forEach((object) => {
                    if(req.body.rank<=object.rank && object.status=='active') {
                        object.rank = object.rank+1;
                    }
                });
                // add
                let rootPath = 'uploads/'+req.id+'/addons';
                if(req.body.img_change) {
                    imgUploadService.singleFileUpload(req.body.image, rootPath, false, null).then((fileName) => {
                        req.body.image = fileName;
                        MultiFileUpload(req.body.custom_list, rootPath).then((customList) => {
                            req.body.custom_list = customList;
                            addonList.push(req.body);
                            productFeatures.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                            { $set: { addon_list: addonList } }, { new: true }, function(err, response) {
                                if(!err) { res.json({ status: true, list: response.addon_list.filter(obj => obj.status=="active") }); }
                                else { res.json({ status: false, error: err, message: "failure" }); }
                            });
                        });
                    });
                }
                else {
                    MultiFileUpload(req.body.custom_list, rootPath).then((customList) => {
                        req.body.custom_list = customList;
                        addonList.push(req.body);
                        productFeatures.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                        { $set: { addon_list: addonList } }, { new: true }, function(err, response) {
                            if(!err) { res.json({ status: true, list: response.addon_list.filter(obj => obj.status=="active") }); }
                            else { res.json({ status: false, error: err, message: "failure" }); }
                        });
                    });
                }
            }
            else {
                res.json({ status: false, error: err, message: "Addon name already exist" });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid login" });
        }
    });
}

exports.details = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id), "addon_list._id": mongoose.Types.ObjectId(req.params.addonId) }, function(err, response) {
        if(!err && response) {
            let filterList = response.addon_list.filter(addon => addon._id.toString()==req.params.addonId);
            if(filterList.length) { res.json({ status: true, data: filterList[0] }); }
            else { res.json({ status: false, error: err, message: "Failure" }); }
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.update = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) {
            let addonList = response.addon_list;
            if(req.body.prev_rank < req.body.rank)
            {
                // dec rank
                addonList.forEach((object) => {
                    if(req.body.prev_rank<object.rank && req.body.rank>=object.rank && object.status=='active') {
                        object.rank = object.rank-1;
                    }
                });
            }
            else if(req.body.prev_rank > req.body.rank)
            {
                // inc rank
                addonList.forEach((object) => {
                    if(req.body.prev_rank>object.rank && req.body.rank<=object.rank && object.status=='active') {
                        object.rank = object.rank+1;
                    }
                });
            }
            let index = addonList.findIndex(object => object._id == req.body._id);
            if(index != -1) {
                // update
                let rootPath = 'uploads/'+req.id+'/addons';
                if(req.body.img_change) {
                    imgUploadService.singleFileUpload(req.body.image, rootPath, false, null).then((fileName) => {
                        req.body.image = fileName;
                        MultiFileUpload(req.body.custom_list, rootPath).then((customList) => {
                            req.body.custom_list = customList;
                            addonList[index] = req.body;
                            productFeatures.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                            { $set: { addon_list: addonList } }, { new: true }, function(err, response) {
                                if(!err) { res.json({ status: true, list: response.addon_list.filter(obj => obj.status=="active") }); }
                                else { res.json({ status: false, error: err, message: "failure" }); }
                            });
                        });
                    });
                }
                else {
                    MultiFileUpload(req.body.custom_list, rootPath).then((customList) => {
                        req.body.custom_list = customList;
                        addonList[index] = req.body;
                        productFeatures.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                        { $set: { addon_list: addonList } }, { new: true }, function(err, response) {
                            if(!err) { res.json({ status: true, list: response.addon_list.filter(obj => obj.status=="active") }); }
                            else { res.json({ status: false, error: err, message: "failure" }); }
                        });
                    });
                }
            }
            else {
                res.json({ status: false, error: "Invalid addon", message: "Failure" });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid login" });
        }
    });
}

exports.soft_remove = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response)
        {
            let addonList = response.addon_list;
            // dec rank
            addonList.forEach((object) => {
                if(req.body.rank<object.rank && object.status=='active') {
                    object.rank = object.rank-1;
                }
            });
            let index = addonList.findIndex(object => object._id == req.body._id);
            if(index != -1) {
                addonList[index].status = "inactive";
                addonList[index].rank = 0;
                // update
                productFeatures.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                { $set: { addon_list: addonList } }, { new: true }, function(err, response) {
                    if(!err) { res.json({ status: true, list: response.addon_list.filter(obj => obj.status=="active") }); }
                    else { res.json({ status: false, error: err, message: "failure" }); }
                });
            }
            else {
                res.json({ status: false, error: "Invalid addon", message: "Failure" });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid login" });
        }
    });
}

async function MultiFileUpload(customList, rootPath) {
    let customArray = [];
    for(let i=0; i<customList.length; i++)
    {
        let optionArray = [];
        let optionList = customList[i].option_list;
        for(let j=0; j<optionList.length; j++)
        {
            if(optionList[j].img_change) {
                optionList[j].image = await imgUploadService.singleFileUpload(optionList[j].image, rootPath, false, null);
            }
            optionArray.push(optionList[j]);
        }
        customList[i].option_list = optionArray; 
        customArray.push(customList[i]);
    }
    return customArray;
}