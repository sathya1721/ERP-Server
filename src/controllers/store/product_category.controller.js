"use strict";
const mongoose = require('mongoose');
const fs = require("fs");
const productCategory = require("../../models/product_category.model");

exports.list = (req, res) => {
    productCategory.find({ store_id: mongoose.Types.ObjectId(req.id), status : "active" }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.add = (req, res) => {
    console.log(req.id);
    console.log(req.body)
    req.body.store_id  = req.id;
    productCategory.findOne({ store_id: mongoose.Types.ObjectId(req.id), name : req.body.name }, function(err, response) {
        if(!err && response)
        {
            res.json({ status: false, error: err, message: "category already exsist" });
        }
        else {
            productCategory.create(req.body, function(err, response) {
                if(!err && response) { res.json({ status: true, data: response }); }
                else { res.json({ status: false, error: err, message: "Unable to add" }); }
            });
        }
    });
}

exports.details = (req, res) => {
    productCategory.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        console.log(response);
        if(!err && response) 
        {
            res.json({ status: true, data: response});
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.update = (req, res) => {
    productCategory.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response) {
            productCategory.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) },
                { $set: req.body}, { new: true }, function(err, response) {
                    if(!err && response) { res.json({ status: true, data: response }); }
                    else { res.json({ status: false, error: err, message: "Unable to update" }); }
                });           
        }
        else {
            res.json({ status: false, error: err, message: "Invalid designation" });
        }
    });
}


exports.soft_remove = (req, res) => {
	productCategory.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            productCategory.findByIdAndUpdate(req.body._id, { $set: { status: 'inactive' } }, function(err, response) {
                if(!err && response) {                    
                    res.json({ status: true });
                }
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid designation" });
        }
    });
}


exports.hard_remove = (req, res) => {
    productCategory.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            productCategory.findOneAndRemove({ _id: req.body._id }, function(err, response) {
                if(!err && response)
                {
                    res.json({ status: true });
                }
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid designation" });
        }
    });
}