const mongoose = require('mongoose');

const purchase_list = new mongoose.Schema({
      code: String,
      material: String,
      description : String,
      quantity : Number,
      unit: String,
      price:Number,
      gst: String,
      grand_total : Number,
})

const purchaseSchema = new mongoose.Schema({
    store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },
    emp_id : String,
    prf_number : String, 
    quote_number :  String, 
    type : String, 
    category : String, 
    po_date : String, 
    order_type : String, 
    location:String, 
    department:String, 
    po_number : String, 
    comp_name : String, 
    cont_person: String, 
    comp_address : String, 
    reference_no :  String, 
    reference_date :  String, 
    po_subject : String, 
    purchase_list: [purchase_list],
    comp_gstin : String, 
    vend_gstin : String, 
    payment :  String, 
    delivery_place : String, 
    vat : String, 
    delivery_date : String, 
    site_contact_person : String, 
    mobile : Number,
    note :  String, 
    mail_status : String, 
    trans_amount : Number,
    trans_tax : Number,
})

const collection = mongoose.model("purchase",purchaseSchema);

module.exports = collection;