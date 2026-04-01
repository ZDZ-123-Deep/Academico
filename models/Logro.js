const mongoose = require('mongoose');

const logroSchema = new mongoose.Schema({}, { strict: false, collection: 'logros' });

module.exports = mongoose.model('Logro', logroSchema);
