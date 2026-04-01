const mongoose = require('mongoose');
const HorarioAtencion = mongoose.model('HorarioAtencion', new mongoose.Schema({}, { strict: false }), 'horarios_atencion');
module.exports = HorarioAtencion;
