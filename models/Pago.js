const mongoose = require('mongoose');
const Pago = mongoose.model('Pago', new mongoose.Schema({}, { strict: false }), 'pagos');
module.exports = Pago;
