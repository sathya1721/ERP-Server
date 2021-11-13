"use strict";
const mongoose = require('mongoose');
const fs = require("fs");
const vendor = require("../../models/vendors.model");


exports.list = (req, res) => {
    vendor.find({ store_id: mongoose.Types.ObjectId(req.id), status : "active" }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.add = (req, res) => {
    console.log(req.id);
    console.log(req.body)
    req.body.store_id  = req.id;
    vendor.findOne({ store_id: mongoose.Types.ObjectId(req.id), vendor_name : req.body.vendor_name }, function(err, response) {
        if(!err && response)
        {
            res.json({ status: false, error: err, message: "vendor already exsist" });
        }
        else {
            vendor.create(req.body, function(err, response) {
                if(!err && response) { res.json({ status: true, data: response }); }
                else { res.json({ status: false, error: err, message: "Unable to add" }); }
            });
        }
    });
}

exports.details = (req, res) => {
    vendor.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
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
    vendor.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response) {
            vendor.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) },
                { $set: req.body}, { new: true }, function(err, response) {
                    if(!err && response) { res.json({ status: true, data: response }); }
                    else { res.json({ status: false, error: err, message: "Unable to update" }); }
                });           
        }
        else {
            res.json({ status: false, error: err, message: "Invalid login" });
        }
    });
}


exports.soft_remove = (req, res) => {
	vendor.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            vendor.findByIdAndUpdate(req.body._id, { $set: { status: 'inactive' } }, function(err, response) {
                if(!err && response) {                    
                    res.json({ status: true });
                }
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid catalog" });
        }
    });
}


exports.hard_remove = (req, res) => {
    vendor.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            vendor.findOneAndRemove({ _id: req.body._id }, function(err, response) {
                if(!err && response)
                {
                    res.json({ status: true });
                }
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid blog" });
        }
    });
}