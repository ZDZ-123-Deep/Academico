const mongoose = require('mongoose');

const sedeSchema = new mongoose.Schema({}, { strict: false, collection: 'sedes' });

module.exports = mongoose.model('Sede', sedeSchema);
