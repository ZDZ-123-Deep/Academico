const mongoose = require('mongoose');

const estudianteSchema = new mongoose.Schema({}, { strict: false, collection: 'estudiante' });

module.exports = mongoose.model('Estudiante', estudianteSchema);
