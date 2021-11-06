const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },  
    department : { type : String },
    designation : { type : String },
    status: { type: String, default : "active" },
    emp_id : { type : String }
});

const collections = mongoose.model('user_designation', designationSchema);

module.exports = collections;