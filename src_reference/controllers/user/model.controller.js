"use strict";
const mongoose = require('mongoose');
const customer = require("../../models/customer.model");
const orderSession = require("../../models/order_session.model");

exports.add = (req, res) => {
    if(req.user_type=='store') { req.id = req.body.customer_id; }
    customer.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(req.id), status: "active" } },
        {
            $lookup: {
                from: "stores",
                localField: "store_id",
                foreignField: "_id",
                as: "storeDetails"
            }
        }
    ], function(err, response) {
        if(!err && response[0]) {
            let customerDetails = response[0];
            let storeDetails = customerDetails.storeDetails[0];
            if(storeDetails.additional_features.custom_model) {
                let modalIndex = customerDetails.model_list.findIndex(obj => obj.name.toLowerCase()==req.body.name.toLowerCase());
                if(modalIndex==-1) {
                    customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) },
                    { $push: { model_list: req.body } }, { new: true }, function(err, response) {
                        if(!err) {
                            res.json({ status: true, data: response });
                        }
                        else {
                            res.json({ status: false, error: err, message: "Failure" });
                        }
                    });
                }
                else { res.json({ status: false, error: err, message: "Name already exists" }); }
            }
            else if(req.body.sid) {
                let sessionId = req.body.sid+'-'+customerDetails._id;
                let sessionData = { store_id: storeDetails._id, session_id: sessionId, model_list: [req.body] };
                orderSession.findOne({ store_id: storeDetails._id, session_id: sessionId, status: "active" }, function(err, response) {
                    if(!err && response) {
                        req.body.updated_on = new Date();
                        orderSession.findByIdAndUpdate(response._id, { $set: sessionData }, { new: true }, function(err, response) {
                            if(!err && response) {
                                res.json({ status: true, data: response });
                            }
                            else {
                                res.json({ status: false, error: err, message: "Unable to create customization" });
                            }
                        });
                    }
                    else {
                        sessionData.currency_type = storeDetails.currency_types.filter(obj => obj.default_currency)[0].country_code;
                        sessionData.shipping_address = storeDetails._id;
                        sessionData.shipping_method = { _id: storeDetails._id, shipping_price: 0, delivery_time: "NA" };
                        orderSession.create(sessionData, function(err, response) {
                            if(!err && response) {
                                res.json({ status: true, data: response });
                            }
                            else {
                                res.json({ status: false, error: err, message: "Unable to create customization" });
                            }
                        });
                    }
                });
            }
            else { res.json({ status: false, error: err, message: "Unable to create customization" }); }
        }
        else { res.json({ status: false, error: err, message: "Failure" }); }
    });
}

exports.update = (req, res) => {
    if(req.user_type=='store') { req.id = req.body.customer_id; }
    req.body.updated_on = new Date();
    customer.findOne({ _id: mongoose.Types.ObjectId(req.id), status: "active" }, function(err, response) {
        if(!err && response) {
            let modalIndex = response.model_list.findIndex(obj => obj.name.toLowerCase()==req.body.name.toLowerCase() && obj._id.toString()!=req.body._id);
            if(modalIndex==-1) {
                customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id), "model_list._id": mongoose.Types.ObjectId(req.body._id) },
                    { $set: { "model_list.$": req.body } }, { new: true }, function(err, response) {
                    if(!err && response) {
                        res.json({ status: true, data: response });
                    }
                    else {
                        res.json({ status: false, error: err, message: "Failure" });
                    }
                });
            }
            else {
                res.json({ status: false, error: err, message: "Name already exists" });
            }
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}

exports.remove = (req, res) => {
    if(req.user_type=='store') { req.id = req.body.customer_id; }
    customer.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.id) },
    { $pull: { model_list: { _id: mongoose.Types.ObjectId(req.body._id) } } }, { new: true }, function(err, response) {
        if(!err) {
            res.json({ status: true, data: response });
        }
        else {
            res.json({ status: false, error: err, message: "Failure" });
        }
    });
}