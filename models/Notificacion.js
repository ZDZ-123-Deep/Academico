const mongoose = require('mongoose');

const NotificacionSchema = new mongoose.Schema({
    titulo: String,
    mensaje: String,
    tipo: { type: String, default: 'noticia' }, // noticia, evento, aviso
    icono: { type: String, default: 'fa-bullhorn' },
    fecha_creacion: { type: String, default: () => new Date().toISOString().replace('T', ' ').substring(0, 19) },
    creado_por: String, // admin user id
    estado: { type: String, default: 'A' } // A = active, I = inactive
}, { collection: 'notificaciones', strict: false });

module.exports = mongoose.model('Notificacion', NotificacionSchema);
