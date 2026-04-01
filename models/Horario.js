const mongoose = require('mongoose');
const Horario = mongoose.model('Horario', new mongoose.Schema({}, { strict: false }), 'horarios');
module.exports = Horario;
