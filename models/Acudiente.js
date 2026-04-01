const mongoose = require('mongoose');

const acudienteSchema = new mongoose.Schema({}, { strict: false, collection: 'acudiente' });

module.exports = mongoose.model('Acudiente', acudienteSchema);
