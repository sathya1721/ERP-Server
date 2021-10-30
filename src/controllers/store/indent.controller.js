const mongoose = require("mongoose");
const indentModel = require("../../models/indents.model");

exports.createIndent = async (req, res) => {
  try {
    let indentToCreate = await new indentModel(req.body);
    await indentToCreate.save();
    res.status(201).json({
      status: 1,
      messages: "New Indent Created",
      data: indentToCreate,
    });
  } catch (err) {
    res.status(500).json({
      status: 0,
      messages: "Failed To Create New Indent",
      error: err,
    });
  }
};

exports.updateIndent = async (req, res) => {
  console.log(req.id);
  try {
    let indentToUpdate = await indentModel.findByIdAndUpdate(
      { store_id: mongoose.Types.ObjectId(req.id) },
      { $set: req.body }
    );
    res.status(201).json({
      status: 1,
      messages: "Indent Updated",
      data: indentToUpdate,
    });
  } catch (err) {
    res.status(500).json({
      status: 0,
      messages: "Failed To Update Indent",
      error: err,
    });
  }
};

exports.deleteIndent = async (req, res) => {
  console.log(req.id);
  try {
    let indentToDelete = await indentModel.findByIdAndDelete({
      store_id: mongoose.Types.ObjectId(req.id),
    });
    res.status(200).json({
      status: true,
      messages: "Indent Deleted",
      data: indentToDelete,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      messages: "Failed To Delete Indent ",
      error: err,
    });
  }
};

exports.getAllIndents = async (req, res) => {
  try {
    let allIndents = await indentModel.find({}).exec();
    res.status(200).json({
      status: 1,
      messages: "Indents Fetched",
      data: allIndents,
    });
  } catch (err) {
    res.status(500).json({
      status: 0,
      messages: "Failed To Fetch Indents",
      error: err,
    });
  }
};

exports.getIndent = async (req, res) => {
  try {
    let indentToFetch = await indentModel.findById({
      store_id: mongoose.Types.ObjectId(req.id),
    });
    res.status(200).json({
      status: true,
      messages: "Indent Fetched",
      data: indentToFetch,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      messages: "Failed To Fetch Indent ",
      error: err,
    });
  }
};
