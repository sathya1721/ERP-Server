"use strict";
const mongoose = require('mongoose');
const bcrypt = require("bcrypt-nodejs");
const saltRounds = bcrypt.genSaltSync(10);
const userlist = require("../../models/userlist.model");
const materials = require("../../models/materials.model");


exports.list = (req, res) => {
    userlist.find({ store_id: mongoose.Types.ObjectId(req.id), status : "active" }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.add = (req, res) => {
    console.log(req.id);
    console.log(req.body)
    req.body.store_id  = req.id;
    req.body.username = req.body.email;
    req.body.password = bcrypt.hashSync("welcome2erp", saltRounds);
    console.log(req.body);
    userlist.findOne({ store_id: mongoose.Types.ObjectId(req.id), email : req.body.email }, function(err, response) {
        if(!err && response)
        {
            res.json({ status: false, error: err, message: "user already exsist" });
        }
        else {
            userlist.create(req.body, function(err, response) {
                if(!err && response) { res.json({ status: true, data: response }); }
                else { res.json({ status: false, error: err, message: "Unable to add" }); }
            });
        }
    });
}

exports.details = (req, res) => {

    userlist.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) 
    {
        if(!err && response) 
        {
            res.json({ status: true, data: response});
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.get_empid = (req, res) => 
{
    userlist.find({ store_id: mongoose.Types.ObjectId(req.id) }, function(err, response) {              
        if(!err && response[0]) 
        {            
            let emp_id = response[0].emp_id + 1;
            res.json({ status: true, message: "Old", data : emp_id });
        }
        else 
        {            
            let emp_id = 1001;
            res.json({ status: true, message: "New User", data : emp_id });
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