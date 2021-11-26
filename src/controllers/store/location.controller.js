"use strict";
const mongoose = require("mongoose");
const fs = require("fs");
const locations = require("../../models/locations.model");


exports.list = (req, res) => {
  locations.find({ store_id: mongoose.Types.ObjectId(req.id), status : "active" }, function(err, response) {
      if(!err && response) { res.json({ status: true, data: response }); }
      else { res.json({ status: false, error: err, message: "failure" }); }
  });
}

exports.add = (req, res) => {
  console.log(req.id);
  console.log(req.body)
  req.body.store_id  = req.id;
  locations.findOne({ store_id: mongoose.Types.ObjectId(req.id), name : req.body.name }, function(err, response) {
      if(!err && response)
      {
          res.json({ status: false, error: err, message: "Location already exsist" });
      }
      else {
        locations.create(req.body, function(err, response) {
              if(!err && response) { res.json({ status: true, data: response }); }
              else { res.json({ status: false, error: err, message: "Unable to add" }); }
          });
      }
  });
}

exports.details = (req, res) => {
  locations.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
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
  locations.findOne({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
      if(!err && response) {
        locations.findOneAndUpdate({ store_id: mongoose.Types.ObjectId(req.id), _id : mongoose.Types.ObjectId(req.body._id) },
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



exports.update_config = (req, res) => {
  locations.findOneAndUpdate(
    { store_id: mongoose.Types.ObjectId(req.id) },
    { $set: req.body },
    { new: true },
    function (err, response) {
      if (!err && response) {
        res.json({ status: true, data: response });
      } else {
        res.json({ status: false, error: err, message: "failure" });
      }
    }
  );
};

exports.soft_remove = (req, res) => {
	locations.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
        if(!err && response)
        {
          locations.findByIdAndUpdate(req.body._id, { $set: { status: 'inactive' } }, function(err, response) {
                if(!err && response) {                    
                    res.json({ status: true });
                }
                else { res.json({ status: false, error: err, message: "Failure" }); }
            });
        }
        else {
            res.json({ status: false, error: err, message: "Invalid branch" });
        }
    });
}

exports.hard_remove = (req, res) => {
  locations.findOne({ _id: mongoose.Types.ObjectId(req.body._id) }, function(err, response) {
      if(!err && response)
      {
          locations.findOneAndRemove({ _id: req.body._id }, function(err, response) {
              if(!err && response)
              {
                  res.json({ status: true });
              }
              else { res.json({ status: false, error: err, message: "Failure" }); }
          });
      }
      else {
          res.json({ status: false, error: err, message: "Invalid branch" });
      }
  });
}


