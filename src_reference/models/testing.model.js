const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    body: { type: Object },
    params: { type: Object },
    query: { type: Object },
    created_on: { type: Date, default: Date.now }
});

const collections = mongoose.model('testing', testSchema, 'testing');

module.exports = collections;