const mongoose = require('mongoose');

const asistenciaSchema = new mongoose.Schema({}, { strict: false, collection: 'asistencia' });
const asistenciaDetSchema = new mongoose.Schema({}, { strict: false, collection: 'asistencia_det' });

const Asistencia = mongoose.model('Asistencia', asistenciaSchema);
const AsistenciaDet = mongoose.model('AsistenciaDet', asistenciaDetSchema);

module.exports = { Asistencia, AsistenciaDet };
