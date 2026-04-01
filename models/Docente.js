const mongoose = require('mongoose');

const docenteSchema = new mongoose.Schema({}, { strict: false, collection: 'docente' });

module.exports = mongoose.model('Docente', docenteSchema);
