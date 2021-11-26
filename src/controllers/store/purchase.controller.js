const mongoose = require("mongoose");
const purchaseModel = require("../../models/purchase.model");

exports.getAllPurchase = (req, res) => {
  purchaseModel.find(
    { store_id: mongoose.Types.ObjectId(req.id) },
    function (err, response) {
      if (!err && response) {
        res.json({ status: true, data: response });
      } else {
        res.json({ status: false, error: err, message: "failure" });
      }
    }
  );
};

exports.details = (req, res) => {
  purchaseModel.findOne(
    {
      store_id: mongoose.Types.ObjectId(req.id),
      _id: mongoose.Types.ObjectId(req.body._id),
    },
    function (err, response) {
      if (!err && response) {
        res.json({ status: true, data: response });
      } else {
        res.json({ status: false, error: err, message: "Failure" });
      }
    }
  );
};

exports.createPurchase = (req, res) => {
  req.body.store_id = req.id;
  purchaseModel.create(req.body, function (err, response) {
    if (!err && response) {
      res.json({ status: true, data: response });
    } else {
      res.json({ status: false, error: err, message: "Unable to add" });
    }
  });
};

exports.updatePurchase = (req, res) => {
  purchaseModel.findOne(
    {
      store_id: mongoose.Types.ObjectId(req.id),
      _id: mongoose.Types.ObjectId(req.body._id),
    },
    function (err, response) {
      if (!err && response) {
        purchaseModel.findOneAndUpdate(
          {
            store_id: mongoose.Types.ObjectId(req.id),
            _id: mongoose.Types.ObjectId(req.body._id),
          },
          { $set: req.body },
          { new: true },
          function (err, response) {
            if (!err && response) {
              res.json({ status: true, data: response });
            } else {
              res.json({
                status: false,
                error: err,
                message: "Unable to update",
              });
            }
          }
        );
      } else {
        res.json({ status: false, error: err, message: "Invalid login" });
      }
    }
  );
};

exports.soft_remove = (req, res) => {
  purchaseModel.findOne(
    { _id: mongoose.Types.ObjectId(req.body._id) },
    function (err, response) {
      if (!err && response) {
        purchaseModel.findByIdAndUpdate(
          req.body._id,
          { $set: { status: "inactive" } },
          function (err, response) {
            if (!err && response) {
              res.json({ status: true });
            } else {
              res.json({ status: false, error: err, message: "Failure" });
            }
          }
        );
      } else {
        res.json({ status: false, error: err, message: "Invalid catalog" });
      }
    }
  );
};

exports.hard_remove = (req, res) => {
  purchaseModel.findOne(
    { _id: mongoose.Types.ObjectId(req.body._id) },
    function (err, response) {
      if (!err && response) {
        purchaseModel.findOneAndRemove(
          { _id: req.body._id },
          function (err, response) {
            if (!err && response) {
              res.json({ status: true });
            } else {
              res.json({ status: false, error: err, message: "Failure" });
            }
          }
        );
      } else {
        res.json({ status: false, error: err, message: "Invalid blog" });
      }
    }
  );
};
