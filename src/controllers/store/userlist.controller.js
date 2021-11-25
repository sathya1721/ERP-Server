"use strict";
const mongoose = require('mongoose');
const fs = require("fs");
const path = require('path');
const bcrypt = require("bcrypt-nodejs");
const saltRounds = bcrypt.genSaltSync(10);
const userlist = require("../../models/userlist.model");
const materials = require("../../models/materials.model");
const imgUploadService = require("../../../services/img_upload.service");

exports.list = (req, res) => {
    userlist.find({ store_id: mongoose.Types.ObjectId(req.id), status : "active" }, function(err, response) {
        if(!err && response) { res.json({ status: true, data: response }); }
        else { res.json({ status: false, error: err, message: "failure" }); }
    });
}

exports.add = (req, res) => {
    console.log(req.id);
    // console.log(req.body);
    // let rootPath = 'uploads/'+req.id+'/category';
    req.body.store_id  = req.id;
    req.body.username = req.body.email;
    req.body.password = bcrypt.hashSync("welcome2erp", saltRounds);
    // console.log(req.body);

        userlist.findOne({ store_id: mongoose.Types.ObjectId(req.id), email : req.body.email }, function(err, response) 
        {
            if(!err && response)
            {
                res.json({ status: false, error: err, message: "user already exsist" });
            }
            else 
            {
                let rootPath = 'uploads/'+req.id+'/user/';
                singleFileUpload(req.body.profileimage, rootPath).then((data) => 
                {
                    req.body.profileimage = data;
                    console.log(req.body.profileimage);
                    userlist.create(req.body, function(err, response) 
                    {
                        console.log(req.body.store_id, )
                        if(!err && response) 
                        {
                        res.json({ status: true, data: response }); 
                        }
                        else { res.json({ status: false, error: err, message: "Unable to add" }); }
                    });
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
    userlist.aggregate([
        { $match : { store_id: mongoose.Types.ObjectId(req.id) }},
        { $sort : { created_on : -1 } }
    ], function(err, response) {           
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

function singleFileUpload(image, rootPath) 
{
    return new Promise((resolve, reject) => {
        let fileType = ""; let base64Data = "";
        if(image.indexOf('png;base64') > -1) {
            fileType = ".png";
            base64Data = image.replace(/^data:image\/png;base64,/, "");
        } else {
            fileType = ".jpeg";
            base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
        }
        let randomName = 'profile-'+new Date().valueOf()+'-'+Math.floor(Math.random() * Math.floor(999999));
        let fileName = rootPath+randomName+fileType;
        // if(!fs.existsSync(rootPath)) {
            fs.mkdir(rootPath, { recursive: true }, (err) => {
                if(!err) {
        fs.writeFile(fileName, base64Data, 'base64', function(err) {
            if(!err) { 
                resolve(fileName); 
            }
            else { reject("logo upload error"); }
        });
    }
    else { resolve(null); }
});
// }
        
    });
}