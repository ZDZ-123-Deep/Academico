const mongoose = require('mongoose');
const Anuncio = mongoose.model('Anuncio', new mongoose.Schema({}, { strict: false }), 'anuncios');
module.exports = Anuncio;
