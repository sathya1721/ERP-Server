const mongoose = require("mongoose");
const indentModel = require("../../models/indents.model");

exports.getAllIndents = (req, res) => {
  indentModel.findOne(
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

exports.createIndent = (req, res) => {
  indentModel.findOne(
    { store_id: mongoose.Types.ObjectId(req.id) },
    function (err, response) {
      if (!err && response) {
        let indentList = response.indent_list;
        // inc rank
        // indentList.forEach((object) => {
        //   if (req.body.rank <= object.rank) {
        //     object.rank = object.rank + 1;
        //   }
        // });
        // add
        indentList.push(req.body);
        indentModel.findOneAndUpdate(
          { store_id: mongoose.Types.ObjectId(req.id) },
          { $set: { indent_list: indentList } },
          { new: true },
          function (err, response) {
            if (!err && response) {
              res.json({ status: true, data: response });
            } else {
              res.json({ status: false, error: err, message: "Unable to add" });
            }
          }
        );
      } else {
        indentModel.create(
          { store_id: req.id, indent_list: [req.body] },
          function (err, response) {
            if (!err && response) {
              res.json({ status: true, data: response });
            } else {
              res.json({ status: false, error: err, message: "Unable to add" });
            }
          }
        );
      }
    }
  );
};

exports.updateIndent = (req, res) => {
  indentModel.findOne(
    { store_id: mongoose.Types.ObjectId(req.id) },
    function (err, response) {
      if (!err && response) {
        let indentList = response.indent_list;
        // if (req.body.prev_rank < req.body.rank) {
        //   // dec rank
        //   indentList.forEach((object) => {
        //     if (
        //       req.body.prev_rank < object.rank &&
        //       req.body.rank >= object.rank
        //     ) {
        //       object.rank = object.rank - 1;
        //     }
        //   });
        // } else if (req.body.prev_rank > req.body.rank) {
        //   // inc rank
        //   indentList.forEach((object) => {
        //     if (
        //       req.body.prev_rank > object.rank &&
        //       req.body.rank <= object.rank
        //     ) {
        //       object.rank = object.rank + 1;
        //     }
        //   });
        // }
        let index = indentList.findIndex(
          (object) => object._id == req.body._id
        );
        if (index != -1) {
          // update
          indentList[index] = req.body;
          indentModel.findOneAndUpdate(
            { store_id: mongoose.Types.ObjectId(req.id) },
            { $set: { indent_list: indentList } },
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
          res.json({
            status: false,
            error: "Invalid location",
            message: "Failure",
          });
        }
      } else {
        res.json({ status: false, error: err, message: "Invalid login" });
      }
    }
  );
};

exports.update_config = (req, res) => {
  indentModel.findOneAndUpdate(
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

exports.PatchIndent = (req, res) => {
  indentModel.findOne(
    { store_id: mongoose.Types.ObjectId(req.id) },
    function (err, response) {
      if (!err && response) {
        let indentList = response.indent_list;
        // dec rank
        // indentList.forEach((object) => {
        //   if (req.body.rank < object.rank) {
        //     object.rank = object.rank - 1;
        //   }
        // });
        let index = indentList.findIndex(
          (object) => object._id == req.body._id
        );
        if (index != -1) {
          indentList.splice(index, 1);
          // update
          indentModel.findOneAndUpdate(
            { store_id: mongoose.Types.ObjectId(req.id) },
            { $set: { indent_list: indentList } },
            { new: true },
            function (err, response) {
              if (!err) {
                res.json({ status: true, data: response });
              } else {
                res.json({ status: false, error: err, message: "failure" });
              }
            }
          );
        } else {
          res.json({
            status: false,
            error: "Invalid location",
            message: "Failure",
          });
        }
      } else {
        res.json({ status: false, error: err, message: "Invalid login" });
      }
    }
  );
};

// exports.createIndent = async (req, res) => {
//   console.log(req.body);
//   try {
//     let indentToCreate = await new indentModel(req.body);
//     await indentToCreate.save();
//     res.status(201).json({
//       status: 1,
//       messages: "New Indent Created",
//       data: indentToCreate,
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: 0,
//       messages: "Failed To Create New Indent",
//       error: err,
//     });
//   }
// };

// exports.updateIndent = async (req, res) => {
//   console.log(req.id);
//   try {
//     let indentToUpdate = await indentModel.findByIdAndUpdate(
//       { store_id: mongoose.Types.ObjectId(req.id) },
//       { $set: req.body }
//     );
//     res.status(201).json({
//       status: 1,
//       messages: "Indent Updated",
//       data: indentToUpdate,
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: 0,
//       messages: "Failed To Update Indent",
//       error: err,
//     });
//   }
// };

// exports.PatchIndent = async (req, res) => {
//   console.log(req.body);
//   try {
//     let indentToDelete = await indentModel.findOne({
//       store_id: mongoose.Types.ObjectId(req.id),
//     });
//     let id = req.body._id;
//     console.log(id);
//     if (req.body.store_id == indentToDelete.store_id) {
//       console.log("if");
//       indentToDelete = await indentModel.findByIdAndDelete(id);
//       console.log("dele", indentToDelete);
//     }
//     res.status(200).json({
//       status: true,
//       messages: "Indent Deleted",
//       data: indentToDelete,
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: false,
//       messages: "Failed To Delete Indent ",
//       error: err,
//     });
//   }
// };

// exports.getAllIndents = async (req, res) => {
//   try {
//     let allIndents = await indentModel.find({}).exec();
//     res.status(200).json({
//       status: 1,
//       messages: "Indents Fetched",
//       data: allIndents,
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: 0,
//       messages: "Failed To Fetch Indents",
//       error: err,
//     });
//   }
// };

// exports.getIndent = async (req, res) => {
//   try {
//     let indentToFetch = await indentModel.findById({
//       store_id: mongoose.Types.ObjectId(req.id),
//     });
//     res.status(200).json({
//       status: true,
//       messages: "Indent Fetched",
//       data: indentToFetch,
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: false,
//       messages: "Failed To Fetch Indent ",
//       error: err,
//     });
//   }
// };
