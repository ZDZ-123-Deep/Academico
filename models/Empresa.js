const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({}, { strict: false, collection: 'empresa' });

module.exports = mongoose.model('Empresa', empresaSchema);
