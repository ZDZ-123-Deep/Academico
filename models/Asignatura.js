const mongoose = require('mongoose');

const asignaturaSchema = new mongoose.Schema({}, { strict: false, collection: 'asignatura' });

module.exports = mongoose.model('Asignatura', asignaturaSchema);
