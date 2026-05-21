const mongoose = require('mongoose');

const TareaSchema = new mongoose.Schema({
    titulo: String,
    descripcion: String,
    teacher_id: String,       // who created it
    pensum_id: String,        // subject (materia)
    class_id: String,         // course
    fecha_creacion: { type: String, default: () => new Date().toISOString().replace('T', ' ').substring(0, 19) },
    fecha_limite: String,     // deadline
    permite_tardia: { type: Boolean, default: false },
    estado: { type: String, default: 'A' }  // A = active, I = inactive
}, { collection: 'tareas', strict: false });

const EntregaTareaSchema = new mongoose.Schema({
    tarea_id: String,
    estudiante_id: String,
    enlace: String,           // external link (Google Drive, OneDrive, etc.)
    comentario: String,
    fecha_entrega: { type: String, default: () => new Date().toISOString().replace('T', ' ').substring(0, 19) },
    es_tardia: { type: Boolean, default: false },
    estado: { type: String, default: 'A' }
}, { collection: 'entregas_tareas', strict: false });

const Tarea = mongoose.model('Tarea', TareaSchema);
const EntregaTarea = mongoose.model('EntregaTarea', EntregaTareaSchema);

module.exports = { Tarea, EntregaTarea };
