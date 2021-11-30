const mongoose = require("mongoose");
const quoteModel = require("../../models/quote.model");

exports.getAllquotes = (req, res) => {
  quoteModel.find(
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
  quoteModel.findOne(
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

exports.createQuote = (req, res) => {
  console.log("bodyyyyy",req.body);
  req.body.store_id = req.id;
  quoteModel.create(req.body, function (err, response) {
    if (!err && response) {
      res.json({ status: true, data: response });
    } else {
      res.json({ status: false, error: err, message: "Unable to add" });
    }
  });
};

exports.updateQuote = (req, res) => {
  console.log("update", req);
  quoteModel.findOne(
    {
      store_id: mongoose.Types.ObjectId(req.id),
      _id: mongoose.Types.ObjectId(req.body._id),
    },
    function (err, response) {
      if (!err && response) {
        quoteModel.findOneAndUpdate(
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
  quoteModel.findOne(
    { _id: mongoose.Types.ObjectId(req.body._id) },
    function (err, response) {
      if (!err && response) {
        quoteModel.findByIdAndUpdate(
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
  quoteModel.findOne(
    { _id: mongoose.Types.ObjectId(req.body._id) },
    function (err, response) {
      if (!err && response) {
        quoteModel.findOneAndRemove(
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
