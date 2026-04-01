const mongoose = require('mongoose');
const Indicador = mongoose.model('Indicador', new mongoose.Schema({}, { strict: false }), 'indicadores');
module.exports = Indicador;
