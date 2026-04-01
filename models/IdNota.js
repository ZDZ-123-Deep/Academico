const mongoose = require('mongoose');

const idNotaSchema = new mongoose.Schema({}, { strict: false, collection: 'id_nota' });

module.exports = mongoose.model('IdNota', idNotaSchema);
