"use strict";
const mongoose = require('mongoose');
const materials = require("../../models/materials.model");


exports.list = (req, res) => {
    materials.find({ store_id: mongoose.Types.ObjectId(req.id), status : "active" }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.add = (req, res) => {
    console.log(req.id);
    console.log(req.body)
    req.body.store_id  = req.id;
    materials.findOne({ store_id: mongoose.Types.ObjectId(req.id), name : req.body.name }, function(err, response) {
        if(!err && response)
        {
            res.json({ status: false, error: err, message: "materials already exsist" });
        }
        else {
            materials.create(req.body, function(err, response) {
                if(!err && response) { res.json({ status: true, data: response }); }
                else { res.json({ status: false, error: err, message: "Unable to add" }); }
            });
        }
    });
}

exports.details = (req, res) => {
    materials.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
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

exports.get_material_code = (req, res) => {
    materials.find({ store_id: mongoose.Types.ObjectId(req.id), category: req.body.name }, function(err, response) {              
        if(!err && response[0]) 
        {            

            let material_code =  req.body.short_name + '-' +String(response.length+1).padStart(4, '0');
            // console.log("old", material_code);
            res.json({ status: true, message: "Old Category", data : material_code });

        }
        else 
        {            
            let material_code = req.body.short_name + '-' +'0001';
            // console.log("new", material_code);
            res.json({ status: true, message: "New Category", data : material_code });
        }
    });
}

exports.update = (req, res) => {
    materials.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response) {
            materials.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) },
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
	materials.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            materials.findByIdAndUpdate(req.body._id, { $set: { status: 'inactive' } }, function(err, response) {
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
    materials.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
            materials.findOneAndRemove({ _id: req.body._id }, function(err, response) {
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