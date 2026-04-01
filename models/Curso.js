const mongoose = require('mongoose');

const cursoSchema = new mongoose.Schema({}, { strict: false, collection: 'curso' });

module.exports = mongoose.model('Curso', cursoSchema);
