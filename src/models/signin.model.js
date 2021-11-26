const mongoose = require('mongoose');

const signinSchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId },
    created_on: { type: Date, default: Date.now },    
    status: { type: String, default : "active" },
    emp_id : { type : Number },
    login_type : { type: String },
    location : { type: String },
    department : { type: String },
    designation : { type: String },
    name : { type: String },
    email : { type: String },
    mobile : { type: String },
    username : { type: String },
    password : { type: String }    
});

const collections = mongoose.model('signin', signinSchema);

module.exports = collections;