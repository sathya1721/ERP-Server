const mongoose = require('mongoose');

const departmentsSchema = new mongoose.Schema({
	store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_on: { type: Date, default: Date.now },  
    department : { type : String },
    status: { type: String, default : "active" }
});

const collections = mongoose.model('departments', departmentsSchema);

module.exports = collections;