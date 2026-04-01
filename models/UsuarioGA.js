const mongoose = require('mongoose');

const usuarioGASchema = new mongoose.Schema({}, { strict: false, collection: 'usuarios' });

module.exports = mongoose.model('UsuarioGA', usuarioGASchema);
