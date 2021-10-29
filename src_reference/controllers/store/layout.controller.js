"use strict";
const mongoose = require('mongoose');
const fs = require("fs");
const layout = require("../../models/layout.model");
const imgUploadService = require("../../../services/img_upload.service");

exports.list = (req, res) => {
    if(req.query.layout_id) {
        layout.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.query.layout_id) }, function(err, response) {
            if(!err && response) {
                res.json({ status: true, data: response });
            }
            else {
                res.json({ status: false, error: err, message: "Invalid User" });
            }
        });
    }
    else {
        layout.find({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
            if(!err && response) {
                res.json({ status: true, list: response });
            }
            else {
                res.json({ status: false, error: err, message: "Invalid User" });
            }
        });
    }
}

exports.add = (req, res) => {
    layout.findOne({ store_id: mongoose.Types.ObjectId(req.id), name: req.body.name }, function(err, response) {
        if(!err && !response)
        {
            req.body.store_id = req.id;
            // inc rank
            layout.updateMany({ store_id: mongoose.Types.ObjectId(req.id), rank: { $gte: req.body.rank } },
            { $inc: { "rank": 1 } }, function(err, response) {
                // add
                layout.create(req.body, function(err, response) {
                    if(!err && response) { res.json({ status: true }); }
                    else { res.json({ status: false, error: err, message: "Unable to add" }); }
                });
            });    
        }
        else {
            res.json({ status: false, error: err, message: "Layout name exist" });
        }
    });
}

exports.update = (req, res) => {
    layout.findOne({ store_id: mongoose.Types.ObjectId(req.id), name: req.body.name, _id: { $ne: mongoose.Types.ObjectId(req.body._id) } }, function(err, response) {
        if(!err && !response)
        {
            layout.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
                if(!err && response)
                {
                    req.body.updated_on = new Date();
                    if(req.body.prev_rank < req.body.rank)
                    {
                        // dec rank
                        layout.updateMany({ store_id: mongoose.Types.ObjectId(req.id), rank: { $gt: req.body.prev_rank, $lte : req.body.rank } },
                        { $inc: { "rank": -1 } }, function(err, response) {
                            // update
                            layout.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
                                if(!err && response) { res.json({ status: true }); }
                                else { res.json({ status: false, error: err, message: "Failure" }); }
                            });
                        });
                    }
                    else if(req.body.prev_rank > req.body.rank)
                    {
                        // inc rank
                        layout.updateMany({ store_id: mongoose.Types.ObjectId(req.id), rank: { $lt: req.body.prev_rank, $gte : req.body.rank } },
                        { $inc: { "rank": 1 } }, function(err, response) {
                            // update
                            layout.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
                                if(!err && response) { res.json({ status: true }); }
                                else { res.json({ status: false, error: err, message: "Failure" }); }
                            });
                        });
                    }
                    else {
                        // update
                        layout.findByIdAndUpdate(req.body._id, { $set: req.body }, function(err, response) {
                            if(!err && response) { res.json({ status: true }); }
                            else { res.json({ status: false, error: err, message: "Failure" }); }
                        });
                    }
                }
                else {
                    res.json({ status: false, error: err, message: "Invalid layout" });
                }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Layout name exist" });
        }
    });   
};

exports.update_image_list = (req, res) => {
    layout.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            let rootPath = 'uploads/'+req.id+'/layouts';
            let existingImgList = response.image_list;
            let newImgList = req.body.image_list.sort((a, b) => 0 - (a.rank > b.rank ? -1 : 1));
            if(response.type=='primary_slider') {
                PrimaryFileUpload(existingImgList, newImgList, rootPath).then((imgList) => {
                    layout.findOneAndUpdate({
                        store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id)
                    },
                    { $set: { "image_list": imgList, updated_on: new Date() } }, function(err, response) {
                        if(!err) { res.json({ status: true }); }
                        else { res.json({ status: false }); }
                    });
                });
            }
            else if(response.type=='shopping_assistant') {
                let SA_config = req.body.shopping_assistant_config;
                if(SA_config.img_change) {
                    // remove existing img
                    if(SA_config.exist_image) {
                        fs.unlink(SA_config.exist_image, function (err) { });
                        let smallImg = SA_config.exist_image.split(".");
                        if(smallImg.length>1) fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { });
                    }
                    // upload new img
                    imgUploadService.singleFileUpload(SA_config.image, rootPath, true, null).then((img) => {
                        SA_config.image = img;
                        layout.findOneAndUpdate({
                            store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id)
                        },
                        { $set: { "shopping_assistant_config": SA_config, updated_on: new Date() } }, function(err, response) {
                            if(!err) { res.json({ status: true }); }
                            else { res.json({ status: false }); }
                        });
                    });
                }
                else {
                    layout.findOneAndUpdate({
                        store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id)
                    },
                    { $set: { "shopping_assistant_config": SA_config, updated_on: new Date() } }, function(err, response) {
                        if(!err) { res.json({ status: true }); }
                        else { res.json({ status: false }); }
                    });
                }
            }
            else {
                MultiFileUpload(existingImgList, newImgList, rootPath).then((imgList) => {
                    layout.findOneAndUpdate({
                        store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id)
                    },
                    { $set: { "image_list": imgList, updated_on: new Date() } }, function(err, response) {
                        if(!err) { res.json({ status: true }); }
                        else { res.json({ status: false }); }
                    });
                });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid User" });
        }
    });
}

exports.delete = (req, res) => {
    layout.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response) {
            let imgList = response.image_list;
            // dec rank
            layout.updateMany({ store_id: mongoose.Types.ObjectId(req.id), rank: { $gt: req.body.rank } },
            { $inc: { "rank": -1 } }, function(err, response) {
                // remove
                layout.findOneAndRemove({ store_id: mongoose.Types.ObjectId(req.id), _id: req.body._id }, function(err, response) {
                    if(!err && response) {
                        unlinkLayoutImages(imgList).then((resp) => {
                            res.json({ status: true });
                        });
                    }
                    else { res.json({ status: false, error: err, message: "Failure" }); }
                });
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid User" });
        }
    });
}

async function MultiFileUpload(existImgList, imgList, rootPath) {
    let recreateImgList = [];
    for(let i=0; i<imgList.length; i++)
    {
        imgList[i].rank = i+1;
        if(imgList[i].desktop_img_change) {
            imgList[i].desktop_img = await imgUploadService.singleFileUpload(imgList[i].desktop_img, rootPath, true, null);
            if(existImgList[i] && existImgList[i].desktop_img && existImgList[i].desktop_img.indexOf('uploads/yourstore/')==-1) {
                fs.unlink(existImgList[i].desktop_img, function (err) { });
                let smallImg = existImgList[i].desktop_img.split(".");
                if(smallImg.length>1) { fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { }); }
            }
        }
        if(imgList[i].mobile_img_change) {
            imgList[i].mobile_img = await imgUploadService.singleFileUpload(imgList[i].mobile_img, rootPath, true, null);
            if(existImgList[i] && existImgList[i].mobile_img && existImgList[i].mobile_img.indexOf('uploads/yourstore/')==-1) {
                fs.unlink(existImgList[i].mobile_img, function (err) { });
                let smallImg = existImgList[i].mobile_img.split(".");
                if(smallImg.length>1) { fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { }); }
            }
        }
        recreateImgList.push(imgList[i]);
    }
    return recreateImgList;
}

async function PrimaryFileUpload(existImgList, imgList, rootPath) {
    let recreateImgList = [];
    for(let i=0; i<imgList.length; i++)
    {
        imgList[i].rank = i+1;
        if(imgList[i].desktop_img_change) {
            let imgName = null;
            if(i===0) {
                imgName = "desktop_primary_slider";
                if(existImgList[i] && existImgList[i].desktop_img && existImgList[i].desktop_img.indexOf('uploads/yourstore/')==-1) {
                    fs.unlink(existImgList[i].desktop_img, function (err) { });
                    let smallImg = existImgList[i].desktop_img.split(".");
                    if(smallImg.length>1) { fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { }); }
                }
            }
            imgList[i].desktop_img = await imgUploadService.singleFileUpload(imgList[i].desktop_img, rootPath, true, imgName);
            if(i>0 && existImgList[i] && existImgList[i].desktop_img && existImgList[i].desktop_img.indexOf('uploads/yourstore/')==-1) {
                fs.unlink(existImgList[i].desktop_img, function (err) { });
                let smallImg = existImgList[i].desktop_img.split(".");
                if(smallImg.length>1) { fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { }); }
            }
        }
        if(imgList[i].mobile_img_change) {
            let imgName = null;
            if(i===0) {
                imgName = "mobile_primary_slider";
                if(existImgList[i] && existImgList[i].mobile_img && existImgList[i].mobile_img.indexOf('uploads/yourstore/')==-1) {
                    fs.unlink(existImgList[i].mobile_img, function (err) { });
                    let smallImg = existImgList[i].mobile_img.split(".");
                    if(smallImg.length>1) { fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { }); }
                }
            }
            imgList[i].mobile_img = await imgUploadService.singleFileUpload(imgList[i].mobile_img, rootPath, true, imgName);
            if(i>0 && existImgList[i] && existImgList[i].mobile_img && existImgList[i].mobile_img.indexOf('uploads/yourstore/')==-1) {
                fs.unlink(existImgList[i].mobile_img, function (err) { });
                let smallImg = existImgList[i].mobile_img.split(".");
                if(smallImg.length>1) { fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { }); }
            }
        }
        recreateImgList.push(imgList[i]);
    }
    return recreateImgList;
}

// unlink images
function unlinkLayoutImages(imgList) {
    return new Promise((resolve, reject) => {
        for(let i=0; i<imgList.length; i++)
        {
            // desktop img
            if(imgList[i].desktop_img && imgList[i].desktop_img.indexOf('uploads/yourstore/')==-1) {
                fs.unlink(imgList[i].desktop_img, function (err) { });
                let smallImg = imgList[i].desktop_img.split(".");
                if(smallImg.length>1) fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { });
            }
            // mobile img
            if(imgList[i].mobile_img && imgList[i].mobile_img.indexOf('uploads/yourstore/')==-1) {
                fs.unlink(imgList[i].mobile_img, function (err) { });
                let smallImg = imgList[i].mobile_img.split(".");
                if(smallImg.length>1) fs.unlink(smallImg[0]+"_s."+smallImg[1], function (err) { });
            }
        }
        resolve(true);
    });
}