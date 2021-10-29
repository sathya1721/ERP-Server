"use strict";
const mongoose = require('mongoose');
const productFeatures = require("../../models/product_features.model");

exports.list = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response) { res.json({ status: true, list: response.faq_list.filter(obj => obj.status=="active") }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.add = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response)
        {
            let faqList = response.faq_list;
            let index = faqList.findIndex(object => object.name==req.body.name && object.status=="active");
            if(index==-1)
            {
                // inc rank
                faqList.forEach((object) => {
                    if(req.body.rank<=object.rank && object.status=='active') {
                        object.rank = object.rank+1;
                    }
                });
                // add
                faqList.push(req.body);
                productFeatures.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                { $set: { faq_list: faqList } }, { new: true }, function(err, response) {
                    if(!err) { res.json({ status: true, list: response.faq_list.filter(obj => obj.status=="active") }); }
                    else { res.json({ status: false, error: err, message: "Unable to add" }); }
                });
            }
            else {
                res.json({ status: false, error: err, message: "Name already exist" });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid login" });
        }
    });
}

exports.update = (req, res) => {
    productFeatures.findOne({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {
        if(!err && response)
        {
            let faqList = response.faq_list;
            if(req.body.prev_rank < req.body.rank)
            {
                // dec rank
                faqList.forEach((object) => {
                    if(req.body.prev_rank<object.rank && req.body.rank>=object.rank && object.status=='active') {
                        object.rank = object.rank-1;
                    }
                });
            }
            else if(req.body.prev_rank > req.body.rank)
            {
                // inc rank
                faqList.forEach((object) => {
                    if(req.body.prev_rank>object.rank && req.body.rank<=object.rank && object.status=='active') {
                        object.rank = object.rank+1;
                    }
                });
            }
            let index = faqList.findIndex(object => object._id == req.body._id);
            if(index != -1) {
                // update
                faqList[index] = req.body;
                productFeatures.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                { $set: { faq_list: faqList } }, { new: true }, function(err, response) {
                    if(!err) { res.json({ status: true, list: response.faq_list.filter(obj => obj.status=="active") }); }
                    else { res.json({ status: false, error: err, message: "Failure" }); }
                });
            }
            else {
                res.json({ status: false, error: "Invalid FAQ", message: "Failure" });
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
            let faqList = response.faq_list;
            // dec rank
            faqList.forEach((object) => {
                if(req.body.rank<object.rank && object.status=='active') {
                    object.rank = object.rank-1;
                }
            });
            let index = faqList.findIndex(object => object._id == req.body._id);
            if(index != -1) {
                faqList[index].status = "inactive";
                faqList[index].rank = 0;
                // update
                productFeatures.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id) },
                { $set: { faq_list: faqList } }, { new: true }, function(err, response) {
                    if(!err) { res.json({ status: true, list: response.faq_list.filter(obj => obj.status=="active") }); }
                    else { res.json({ status: false, error: err, message: "failure" }); }
                });
            }
            else {
                res.json({ status: false, error: "Invalid FAQ", message: "Failure" });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Invalid login" });
        }
    });
}