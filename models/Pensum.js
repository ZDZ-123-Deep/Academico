const mongoose = require('mongoose');

const pensumSchema = new mongoose.Schema({}, { strict: false, collection: 'pensum' });

module.exports = mongoose.model('Pensum', pensumSchema);
