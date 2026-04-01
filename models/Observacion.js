const mongoose = require('mongoose');

const observacionSchema = new mongoose.Schema({}, { strict: false, collection: 'observacion' });
const observacionDocenteSchema = new mongoose.Schema({}, { strict: false, collection: 'observacion_docente' });
const observacionDirgrupoSchema = new mongoose.Schema({}, { strict: false, collection: 'observacion_dirgrupo' });

const Observacion = mongoose.model('Observacion', observacionSchema);
const ObservacionDocente = mongoose.model('ObservacionDocente', observacionDocenteSchema);
const ObservacionDirgrupo = mongoose.model('ObservacionDirgrupo', observacionDirgrupoSchema);

module.exports = { Observacion, ObservacionDocente, ObservacionDirgrupo };
