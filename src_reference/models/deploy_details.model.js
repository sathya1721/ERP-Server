const mongoose = require('mongoose');

// TRIAL FEATURES
const trailSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
    uninstalled: { type: Boolean, default: false },
    paid: { type: Boolean, default: false },
    create_on: { type: Date, default: Date.now }
}, { _id : false });

const deploySchema = new mongoose.Schema({
    store_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    deploy_stages: {
        logo: { type: Boolean, default: false },
        domain: { type: Boolean, default: false },
        home_layouts: { type: Boolean, default: false },
        tax_rates: { type: Boolean, default: false },
        products: { type: Boolean, default: false },
        shipping: { type: Boolean, default: false },
        payments: { type: Boolean, default: false },
        package: { type: Boolean, default: false }
    },
    trial_features: [ trailSchema ],
    theme_colors: {
        primary: { type: String },
        secondary: { type: String }
    }
});

const collections = mongoose.model('deploy_details', deploySchema);

module.exports = collections;