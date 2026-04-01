const mongoose = require('mongoose');

const planillaDetalleSchema = new mongoose.Schema({}, { strict: false, collection: 'planilla_detalle' });
const planillaConsultaSchema = new mongoose.Schema({}, { strict: false, collection: 'planilla_consulta' });
const planillaSchema = new mongoose.Schema({}, { strict: false, collection: 'planilla' });

const PlanillaDetalle = mongoose.model('PlanillaDetalle', planillaDetalleSchema);
const PlanillaConsulta = mongoose.model('PlanillaConsulta', planillaConsultaSchema);
const Planilla = mongoose.model('Planilla', planillaSchema);

module.exports = { PlanillaDetalle, PlanillaConsulta, Planilla };
