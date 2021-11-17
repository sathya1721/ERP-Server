const mongoose = require('mongoose');

const userlistSchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },    
    status: { type: String, default : "active" },
    emp_id : { type : Number },
    sirname : { type: String },
    firstname : { type: String },
    lastname : { type: String },
    name : { type: String },
    designation : { type: String },
    department : { type: String },
    dob : { type: Date },
    bloodgroup : { type: String },
    doj : { type: Date },
    address : { type: String },
    mobile : { type: String },
    personal_mobile : { type : String },
    location : { type: String },
    relationship : { type: String },
    emergency_mobile : { type: String },
    personnel_email : { type: String },
    email : { type: String },
    salary : { type: String },
    qualification : { type: String },    
    experience : { type: String },    
    profileimage : { type: String },
    resigned_date : { type: Date },
    username : { type: String },
    password : { type: String }
});

const collections = mongoose.model('userlist', userlistSchema);

module.exports = collections;