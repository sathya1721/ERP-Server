const mongoose = require('mongoose');
const purchaseModel = require('../../models/purchase.model');

exports.getAllPurchase = (req,res)=>{
    purchaseModel.find({store_id: mongoose.Types.ObjectId(req.id) },function(err,response){
        if (!err && response) {
            res.json({status:true,data:response})
        }else{
            res.json({status:false, error: err, message: "failure" })
        }
    })
}

exports.createPurchase = (req,res)=>{
    req.body.store_id = req.id;
    purchaseModel.create(req.body,function(err,response){
        if (!err && response) {
            res.json({status:true,data:response})
        }else{
            res.json({status:false,err:err,message:"unable to add"})
        }
    })
}