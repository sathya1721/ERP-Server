const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
	name: { type: String, required: true },
	rank: { type: Number, required: true },
	description: { type: String },
	currency_types: { type: Object },
	trial_status: { type: Boolean },
	trial_upto_in_days: { type: Number, default: 0 },
	trial_features: { type: Array, default: [] },
	status: { type: String, default: 'active' },
    created_on: { type: Date, default: Date.now }
});

const collections = mongoose.model('ys_packages', packageSchema);

module.exports = collections;