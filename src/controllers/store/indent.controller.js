const mongoose = require("mongoose");
const indentModel = require("../../models/indents.model");

exports.getAllIndents = (req, res) => {
  indentModel.aggregate([
    { $match : { store_id: mongoose.Types.ObjectId(req.id)}} ,
    { $sort : { _id : -1 } }],
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
  indentModel.findOne(
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

exports.createIndent = (req, res) => {
  console.log("bodyyyyy",req.body);
  
  req.body.store_id = req.id;
  indentModel.create(req.body, function (err, response) {
    if (!err && response) {
      res.json({ status: true, data: response });
    } else {
      res.json({ status: false, error: err, message: "Unable to add" });
    }
  });
};

exports.updateIndent = (req, res) => {
  console.log("update", req);
  indentModel.findOne(
    {
      store_id: mongoose.Types.ObjectId(req.id),
      _id: mongoose.Types.ObjectId(req.body._id),
    },
    function (err, response) {
      if (!err && response) {
        indentModel.findOneAndUpdate(
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
  indentModel.findOne(
    { _id: mongoose.Types.ObjectId(req.body._id) },
    function (err, response) {
      if (!err && response) {
        indentModel.findByIdAndUpdate(
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
  indentModel.findOne(
    { _id: mongoose.Types.ObjectId(req.body._id) },
    function (err, response) {
      if (!err && response) {
        indentModel.findOneAndRemove(
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

// exports.details = (req, res) => {
//   indentModel.findOne(
//     { store_id: mongoose.Types.ObjectId(req.id) },
//     function (err, response) {
//       if (!err && response) {
//         let indentList = response;
//         let index = indentList.findIndex(
//           (object) => object._id == req.body._id
//         );
//         console.log(index);
//         res.json({ status: true, data: indentList[index] });
//       } else {
//         res.json({ status: false, error: err, message: "Failure" });
//       }
//     }
//   );
// };

// exports.getAllIndents = (req, res) => {
//   indentModel.findOne(
//     { store_id: mongoose.Types.ObjectId(req.id) },
//     function (err, response) {
//       if (!err && response) {
//         res.json({ status: true, data: response });
//       } else {
//         res.json({ status: false, error: err, message: "failure" });
//       }
//     }
//   );
// };
// exports.createIndent = (req, res) => {
//   indentModel.findOne(
//     { store_id: mongoose.Types.ObjectId(req.id) },
//     function (err, response) {
//       if (!err && response) {
//         console.log("responeeeeeeee", response);
//         let indentList = response.indent_list;
//         // inc rank
//         // indentList.forEach((object) => {
//         //   if (req.body.rank <= object.rank) {
//         //     object.rank = object.rank + 1;
//         //   }
//         // });
//         // add
//         indentList = req.body;
//         indentModel.findOneAndUpdate(
//           { store_id: mongoose.Types.ObjectId(req.id) },
//           { $set: { indent_list: indentList } },
//           { new: true },
//           function (err, response) {
//             if (!err && response) {
//               res.json({ status: true, data: response });
//             } else {
//               res.json({ status: false, error: err, message: "Unable to add" });
//             }
//           }
//         );
//       } else {
//         console.log("else");

//         //   else {
//         //     materials.create(req.body, function(err, response) {
//         //         if(!err && response) { res.json({ status: true, data: response }); }
//         //         else { res.json({ status: false, error: err, message: "Unable to add" }); }
//         //     });
//         // }
//         indentModel.create(req.body, function (err, response) {
//           console.log("else respoo", response);
//           if (!err && response) {
//             res.json({ status: true, data: response });
//           } else {
//             res.json({ status: false, error: err, message: "Unable to add" });
//           }
//         });
//       }
//     }
//   );
// };
// exports.updateIndent = (req, res) => {
//   indentModel.findOne(
//     { store_id: mongoose.Types.ObjectId(req.id) },
//     function (err, response) {
//       if (!err && response) {
//         let indentList = response;
//         let index = indentList.findIndex(
//           (object) => object._id == req.body._id
//         );
//         if (index != -1) {
//           // update
//           indentList[index] = req.body;
//           indentModel.findOneAndUpdate(
//             { store_id: mongoose.Types.ObjectId(req.id) },
//             { $set: indentList },
//             { new: true },
//             function (err, response) {
//               if (!err && response) {
//                 res.json({ status: true, data: response });
//               } else {
//                 res.json({
//                   status: false,
//                   error: err,
//                   message: "Unable to update",
//                 });
//               }
//             }
//           );
//         } else {
//           res.json({
//             status: false,
//             error: "Invalid location",
//             message: "Failure",
//           });
//         }
//       } else {
//         res.json({ status: false, error: err, message: "Invalid login" });
//       }
//     }
//   );
// };

// exports.update_config = (req, res) => {
//   indentModel.findOneAndUpdate(
//     { store_id: mongoose.Types.ObjectId(req.id) },
//     { $set: req.body },
//     { new: true },
//     function (err, response) {
//       if (!err && response) {
//         res.json({ status: true, data: response });
//       } else {
//         res.json({ status: false, error: err, message: "failure" });
//       }
//     }
//   );
// };

// exports.PatchIndent = (req, res) => {
//   indentModel.findOne(
//     { store_id: mongoose.Types.ObjectId(req.id) },
//     function (err, response) {
//       if (!err && response) {
//         let indentList = response;
// dec rank
// indentList.forEach((object) => {
//   if (req.body.rank < object.rank) {
//     object.rank = object.rank - 1;
//   }
// });
// let index = indentList.findIndex(
//   (object) => object._id == req.body._id
// );
// if (index != -1) {
//   indentList.splice(index, 1);
// update
//           indentModel.findOneAndUpdate(
//             { store_id: mongoose.Types.ObjectId(req.id) },
//             { $set: indentList },
//             { new: true },
//             function (err, response) {
//               if (!err) {
//                 res.json({ status: true, data: response });
//               } else {
//                 res.json({ status: false, error: err, message: "failure" });
//               }
//             }
//           );
//         } else {
//           res.json({
//             status: false,
//             error: "Invalid location",
//             message: "Failure",
//           });
//         }
//       } else {
//         res.json({ status: false, error: err, message: "Invalid login" });
//       }
//     }
//   );
// };

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
