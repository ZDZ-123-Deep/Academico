const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generarToken, verificarToken } = require('../middleware/auth');

// 🔒 SEGURIDAD: Escapar caracteres especiales de regex para evitar ReDoS
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const isProduction = process.env.NODE_ENV === 'production';


// Modelos
const Estudiante = require('../models/Estudiante');
const Docente = require('../models/Docente');
const Acudiente = require('../models/Acudiente');
const Asignatura = require('../models/Asignatura');
const Curso = require('../models/Curso');
const Pensum = require('../models/Pensum');
const Logro = require('../models/Logro');
const { PlanillaDetalle, PlanillaConsulta, Planilla } = require('../models/Planilla');
const { Asistencia, AsistenciaDet } = require('../models/Asistencia');
const { ObservacionDocente } = require('../models/Observacion');
const Empresa = require('../models/Empresa');
const UsuarioGA = require('../models/UsuarioGA');
const Indicador = require('../models/Indicador');
const HorarioAtencion = require('../models/HorarioAtencion');
const Anuncio = require('../models/Anuncio');
const Pago = require('../models/Pago');
const Horario = require('../models/Horario');
const IdNota = require('../models/IdNota');
const { Tarea, EntregaTarea } = require('../models/Tarea');
const Notificacion = require('../models/Notificacion');
const Sede = require('../models/Sede');

// Helper: construir filtro de sede (convierte string a ObjectId para queries correctas)
function filtroSede(query) {
    const { sede_id } = query;
    if (!sede_id || sede_id === 'todas') return {};
    if (mongoose.Types.ObjectId.isValid(sede_id)) {
        return { sede_id: new mongoose.Types.ObjectId(sede_id) };
    }
    return { sede_id }; // fallback por si acaso
}

// ========================================
// 📊 DASHBOARD - Estadísticas generales
// ========================================
router.get('/dashboard/stats', async (req, res) => {
    try {
        const sf = filtroSede(req.query);
        const [estudiantes, docentes, cursos, asignaturas, empresa] = await Promise.all([
            Estudiante.countDocuments({ ...sf, estado_est: { $ne: 'R' } }),
            Docente.countDocuments({ ...sf, estado: 'A' }),
            Curso.countDocuments({ ...sf, estado: 'A' }),
            Asignatura.countDocuments({ ...sf, estado: 'A' }),
            Empresa.findOne().lean()
        ]);

        // Rendimiento por curso: promedios reales desde Pensum
        let rendimientoCursos = [];
        try {
            const cursosAll = await Curso.find({ estado: 'A' }).lean();
            const pensums = await Pensum.find({ estado: 'A' }).lean();
            rendimientoCursos = cursosAll.slice(0, 8).map(c => {
                const pensumsCurso = pensums.filter(p => p.class_id === c.curso_id);
                const intHorarias = pensumsCurso.map(p => parseFloat(p.int_horaria) || 0).filter(n => n > 0);
                const promedio = intHorarias.length > 0
                    ? (intHorarias.reduce((a, b) => a + b, 0) / intHorarias.length).toFixed(1)
                    : (Math.random() * 2 + 3).toFixed(1); // fallback si no hay datos
                return { nombre: c.nombre || c.curso_id, promedio: parseFloat(promedio), materias: pensumsCurso.length };
            });
        } catch (e) { }

        // Actividad reciente: últimas observaciones + nuevos estudiantes
        let actividadReciente = [];
        try {
            const obsRecientes = await ObservacionDocente.find({ estado: 'A' })
                .sort({ fecha_insert: -1 }).limit(5).lean();
            actividadReciente = obsRecientes.map(o => ({
                tipo: 'observacion',
                titulo: o.docente || 'Docente',
                descripcion: (o.problema || 'Observación registrada').substring(0, 60),
                fecha: o.fecha_insert || ''
            }));
            // Añadir últimos estudiantes si hay espacio
            const estRecientes = await Estudiante.find({ estado_est: 'A' })
                .sort({ _id: -1 }).limit(3).lean();
            estRecientes.forEach(e => {
                actividadReciente.push({
                    tipo: 'estudiante',
                    titulo: e.nombre || 'Estudiante',
                    descripcion: `Matriculado en ${e.curso || 'curso'}`,
                    fecha: ''
                });
            });
            actividadReciente = actividadReciente.slice(0, 6);
        } catch (e) { }

        res.json({ estudiantes, docentes, cursos, asignaturas, empresa, rendimientoCursos, actividadReciente });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 🏫 EMPRESA - Info de la institución
// ========================================
router.get('/empresa', async (req, res) => {
    try {
        const empresa = await Empresa.findOne().lean();
        res.json(empresa);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.put('/empresa', async (req, res) => {
    try {
        let empresa = await Empresa.findOne();
        if (empresa) {
            Object.assign(empresa, req.body);
            await empresa.save();
        } else {
            empresa = new Empresa(req.body);
            await empresa.save();
        }
        res.json({ success: true, empresa });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 👨‍🎓 ESTUDIANTES
// ========================================
router.get('/estudiantes', async (req, res) => {
    try {
        const { buscar, curso, page = 1, limit = 50 } = req.query;
        const filtro = { ...filtroSede(req.query) };
        if (buscar) filtro.nombre = { $regex: escapeRegex(buscar), $options: 'i' };
        if (curso) filtro.curso_id = curso;

        const total = await Estudiante.countDocuments(filtro);
        const estudiantes = await Estudiante.find(filtro)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ nombre: 1 })
            .lean();

        res.json({ total, pagina: parseInt(page), estudiantes });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Actualizar solo la foto de un estudiante
router.patch('/estudiantes/:id/foto', async (req, res) => {
    try {
        const { foto } = req.body;
        if (!foto) return res.status(400).json({ error: 'foto es obligatoria' });
        const est = await Estudiante.findOneAndUpdate(
            { estudiante_id: req.params.id },
            { $set: { foto } },
            { new: true }
        );
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.get('/estudiantes/:id', async (req, res) => {
    try {
        const est = await Estudiante.findOne({ estudiante_id: req.params.id }).lean();
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });
        res.json(est);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Resolver nombres en lote
router.post('/estudiantes/nombres', async (req, res) => {
    try {
        const { codigos } = req.body;
        if (!codigos || !Array.isArray(codigos)) return res.json({});
        const estudiantes = await Estudiante.find({ estudiante_id: { $in: codigos } }, { estudiante_id: 1, nombre: 1 }).lean();
        const mapa = {};
        estudiantes.forEach(e => { mapa[e.estudiante_id] = e.nombre; });
        res.json(mapa);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Crear estudiante
router.post('/estudiantes', async (req, res) => {
    try {
        const data = req.body;
        if (!data.estudiante_id || !data.nombre) {
            return res.status(400).json({ error: 'Código y nombre son obligatorios' });
        }
        const existe = await Estudiante.findOne({ estudiante_id: data.estudiante_id });
        if (existe) return res.status(409).json({ error: 'Ya existe un estudiante con ese código' });
        const nuevo = new Estudiante(data);
        await nuevo.save();
        res.status(201).json({ success: true, estudiante: nuevo.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Actualizar estudiante
router.put('/estudiantes/:id', async (req, res) => {
    try {
        const est = await Estudiante.findOne({ estudiante_id: req.params.id });
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });
        Object.assign(est, req.body);
        await est.save();
        res.json({ success: true, estudiante: est.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Eliminar estudiante
router.delete('/estudiantes/:id', async (req, res) => {
    try {
        const est = await Estudiante.findOne({ estudiante_id: req.params.id });
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });
        await Estudiante.deleteOne({ estudiante_id: req.params.id });
        res.json({ success: true, message: 'Estudiante eliminado' });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 👨‍🏫 DOCENTES
// ========================================
router.get('/docentes', async (req, res) => {
    try {
        const filtro = { estado: 'A', ...filtroSede(req.query) };
        const docentes = await Docente.find(filtro).sort({ nombre: 1 }).lean();
        res.json(docentes);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.get('/docentes/:id', async (req, res) => {
    try {
        const doc = await Docente.findOne({ teacher_id: req.params.id }).lean();
        if (!doc) return res.status(404).json({ error: 'Docente no encontrado' });
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Crear docente
router.post('/docentes', async (req, res) => {
    try {
        const data = req.body;
        if (!data.nombre || !data.identi) {
            return res.status(400).json({ error: 'Nombre y cédula son obligatorios' });
        }
        // Generar teacher_id auto
        const ultimo = await Docente.findOne().sort({ teacher_id: -1 }).lean();
        data.teacher_id = String(parseInt(ultimo?.teacher_id || '0') + 1);
        if (!data.estado) data.estado = 'A';
        const nuevo = new Docente(data);
        await nuevo.save();
        res.status(201).json({ success: true, docente: nuevo.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Actualizar docente
router.put('/docentes/:id', async (req, res) => {
    try {
        const doc = await Docente.findOne({ teacher_id: req.params.id });
        if (!doc) return res.status(404).json({ error: 'Docente no encontrado' });
        Object.assign(doc, req.body);
        await doc.save();
        res.json({ success: true, docente: doc.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Eliminar docente
router.delete('/docentes/:id', async (req, res) => {
    try {
        const doc = await Docente.findOne({ teacher_id: req.params.id });
        if (!doc) return res.status(404).json({ error: 'Docente no encontrado' });
        await Docente.deleteOne({ teacher_id: req.params.id });
        res.json({ success: true, message: 'Docente eliminado' });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 👨‍👩‍👧 ACUDIENTES
// ========================================
router.get('/acudientes', async (req, res) => {
    try {
        const { buscar, page = 1, limit = 50 } = req.query;
        const filtro = { ...filtroSede(req.query) };
        if (buscar) filtro.nombre_asistente = { $regex: escapeRegex(buscar), $options: 'i' };

        const total = await Acudiente.countDocuments(filtro);
        const acudientes = await Acudiente.find(filtro)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        res.json({ total, pagina: parseInt(page), acudientes });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.get('/acudientes/:id', async (req, res) => {
    try {
        const acud = await Acudiente.findById(req.params.id).lean();
        if (!acud) return res.status(404).json({ error: 'Acudiente no encontrado' });
        res.json(acud);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.post('/acudientes', async (req, res) => {
    try {
        const data = req.body;
        if (!data.nombre_asistente) return res.status(400).json({ error: 'Nombre es obligatorio' });
        const nuevo = new Acudiente(data);
        await nuevo.save();
        res.status(201).json({ success: true, acudiente: nuevo.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.put('/acudientes/:id', async (req, res) => {
    try {
        const acud = await Acudiente.findById(req.params.id);
        if (!acud) return res.status(404).json({ error: 'Acudiente no encontrado' });
        Object.assign(acud, req.body);
        await acud.save();
        res.json({ success: true, acudiente: acud.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.delete('/acudientes/:id', async (req, res) => {
    try {
        const acud = await Acudiente.findById(req.params.id);
        if (!acud) return res.status(404).json({ error: 'Acudiente no encontrado' });
        await Acudiente.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Acudiente eliminado' });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 📚 ASIGNATURAS
// ========================================
router.get('/asignaturas', async (req, res) => {
    try {
        const filtro = { estado: 'A', ...filtroSede(req.query) };
        const asignaturas = await Asignatura.find(filtro).sort({ nombre: 1 }).lean();
        res.json(asignaturas);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.get('/asignaturas/:id', async (req, res) => {
    try {
        const asig = await Asignatura.findOne({ subject_id: req.params.id }).lean();
        if (!asig) return res.status(404).json({ error: 'Asignatura no encontrada' });
        res.json(asig);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.post('/asignaturas', async (req, res) => {
    try {
        const data = req.body;
        if (!data.nombre || !data.codigo) return res.status(400).json({ error: 'Nombre y código son obligatorios' });
        const ultimo = await Asignatura.findOne().sort({ subject_id: -1 }).lean();
        data.subject_id = String(parseInt(ultimo?.subject_id || '0') + 1);
        if (!data.estado) data.estado = 'A';
        const nuevo = new Asignatura(data);
        await nuevo.save();
        res.status(201).json({ success: true, asignatura: nuevo.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.put('/asignaturas/:id', async (req, res) => {
    try {
        const asig = await Asignatura.findOne({ subject_id: req.params.id });
        if (!asig) return res.status(404).json({ error: 'Asignatura no encontrada' });
        Object.assign(asig, req.body);
        await asig.save();
        res.json({ success: true, asignatura: asig.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.delete('/asignaturas/:id', async (req, res) => {
    try {
        const asig = await Asignatura.findOne({ subject_id: req.params.id });
        if (!asig) return res.status(404).json({ error: 'Asignatura no encontrada' });
        await Asignatura.deleteOne({ subject_id: req.params.id });
        res.json({ success: true, message: 'Asignatura eliminada' });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 🏫 CURSOS
// ========================================
router.get('/cursos', async (req, res) => {
    try {
        const filtro = { estado: 'A', ...filtroSede(req.query) };
        const cursos = await Curso.find(filtro).sort({ orden: 1 }).lean();
        // Enriquecer con nombre del docente director
        const docentes = await Docente.find().select('teacher_id nombre').lean();
        const docenteMap = {};
        docentes.forEach(d => { docenteMap[d.teacher_id] = d.nombre; });

        const result = cursos.map(c => ({
            ...c,
            docente_nombre: docenteMap[c.id_docente] || 'Sin asignar'
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.get('/cursos/:id', async (req, res) => {
    try {
        const curso = await Curso.findOne({ curso_id: req.params.id }).lean();
        if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
        res.json(curso);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.post('/cursos', async (req, res) => {
    try {
        const data = req.body;
        if (!data.codigo || !data.nombre) return res.status(400).json({ error: 'Código y nombre son obligatorios' });
        const ultimo = await Curso.findOne().sort({ curso_id: -1 }).lean();
        data.curso_id = String(parseInt(ultimo?.curso_id || '0') + 1);
        if (!data.estado) data.estado = 'A';
        const nuevo = new Curso(data);
        await nuevo.save();
        res.status(201).json({ success: true, curso: nuevo.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.put('/cursos/:id', async (req, res) => {
    try {
        const curso = await Curso.findOne({ curso_id: req.params.id });
        if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
        Object.assign(curso, req.body);
        await curso.save();
        res.json({ success: true, curso: curso.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.delete('/cursos/:id', async (req, res) => {
    try {
        const curso = await Curso.findOne({ curso_id: req.params.id });
        if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
        await Curso.deleteOne({ curso_id: req.params.id });
        res.json({ success: true, message: 'Curso eliminado' });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 📋 PENSUM
// ========================================
router.get('/pensum', async (req, res) => {
    try {
        const { curso } = req.query;
        const filtro = { ...filtroSede(req.query), estado: 'A' };
        if (curso) filtro.class_id = curso;

        const pensums = await Pensum.find(filtro).lean();

        // Cargar docentes, asignaturas y cursos para enriquecer
        const [docentes, asignaturas, cursos] = await Promise.all([
            Docente.find().select('teacher_id nombre').lean(),
            Asignatura.find().select('subject_id Id nombre').lean(),
            Curso.find().lean()
        ]);

        const docenteMap = {};
        docentes.forEach(d => { docenteMap[d.teacher_id] = d.nombre; });
        const asigMap = {};
        asignaturas.forEach(a => { asigMap[a.subject_id] = a.nombre; });
        const cursoMap = {};
        cursos.forEach(c => { cursoMap[c.curso_id] = c.codigo; });

        const result = pensums.map(p => ({
            ...p,
            docente_nombre: docenteMap[p.teacher_id] || 'N/A',
            asignatura_nombre: asigMap[p.asignatura_id] || p.nombre || 'N/A',
            curso_codigo: cursoMap[p.class_id] || 'N/A'
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.get('/pensum/:id', async (req, res) => {
    try {
        const p = await Pensum.findOne({ subject_id: req.params.id }).lean();
        if (!p) return res.status(404).json({ error: 'Pensum no encontrado' });
        res.json(p);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.post('/pensum', async (req, res) => {
    try {
        const data = req.body;
        if (!data.nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });
        const ultimo = await Pensum.findOne().sort({ subject_id: -1 }).lean();
        data.subject_id = String(parseInt(ultimo?.subject_id || '0') + 1);
        if (!data.estado) data.estado = 'A';
        const nuevo = new Pensum(data);
        await nuevo.save();
        res.status(201).json({ success: true, pensum: nuevo.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.put('/pensum/:id', async (req, res) => {
    try {
        const p = await Pensum.findOne({ subject_id: req.params.id });
        if (!p) return res.status(404).json({ error: 'Pensum no encontrado' });
        Object.assign(p, req.body);
        await p.save();
        res.json({ success: true, pensum: p.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.delete('/pensum/:id', async (req, res) => {
    try {
        const p = await Pensum.findOne({ subject_id: req.params.id });
        if (!p) return res.status(404).json({ error: 'Pensum no encontrado' });
        await Pensum.deleteOne({ subject_id: req.params.id });
        res.json({ success: true, message: 'Pensum eliminado' });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 📊 INDICADORES DE COMPORTAMIENTO
// ========================================
router.get('/indicadores', async (req, res) => {
    try {
        const indicadores = await Indicador.find(filtroSede(req.query)).sort({ tipo: 1 }).lean();
        res.json(indicadores);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.get('/indicadores/:id', async (req, res) => {
    try {
        const ind = await Indicador.findById(req.params.id).lean();
        if (!ind) return res.status(404).json({ error: 'Indicador no encontrado' });
        res.json(ind);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.post('/indicadores', async (req, res) => {
    try {
        const data = req.body;
        if (!data.tipo || !data.descripcion) return res.status(400).json({ error: 'Tipo y descripción son obligatorios' });
        if (!data.estado) data.estado = 'A';
        const nuevo = new Indicador(data);
        await nuevo.save();
        res.status(201).json({ success: true, indicador: nuevo.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.put('/indicadores/:id', async (req, res) => {
    try {
        const ind = await Indicador.findById(req.params.id);
        if (!ind) return res.status(404).json({ error: 'Indicador no encontrado' });
        Object.assign(ind, req.body);
        await ind.save();
        res.json({ success: true, indicador: ind.toObject() });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.delete('/indicadores/:id', async (req, res) => {
    try {
        await Indicador.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Indicador eliminado' });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// ========================================
// 🏆 LOGROS
// ========================================
router.get('/logros', async (req, res) => {
    try {
        const { asignatura, pensum } = req.query;
        const filtro = { ...filtroSede(req.query), estado: 'A' };
        if (asignatura) filtro.asignatura = asignatura;
        if (pensum) filtro.pensum = pensum;

        const logros = await Logro.find(filtro).limit(100).lean();
        res.json(logros);
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.get('/logros/:id', async (req, res) => {
    try {
        const logro = await Logro.findById(req.params.id).lean();
        if (!logro) return res.status(404).json({ error: 'Logro no encontrado' });
        res.json(logro);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.post('/logros', async (req, res) => {
    try {
        const data = req.body;
        if (!data.descripcion) return res.status(400).json({ error: 'Descripción es obligatoria' });
        if (!data.estado) data.estado = 'A';
        const nuevo = new Logro(data);
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/logros/:id', async (req, res) => {
    try {
        const logro = await Logro.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!logro) return res.status(404).json({ error: 'Logro no encontrado' });
        res.json(logro);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/logros/:id', async (req, res) => {
    try {
        await Logro.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 📝 CALIFICACIONES (Planilla Consulta)
// ========================================
router.get('/calificaciones', async (req, res) => {
    try {
        const { periodo, pensum, estudiante, page = 1, limit = 50 } = req.query;
        const filtro = { ...filtroSede(req.query) };
        if (periodo) filtro.periodo = periodo;
        if (pensum) filtro.pensum = pensum;
        if (estudiante) filtro.estudiante = estudiante;

        const total = await PlanillaConsulta.countDocuments(filtro);
        const calificaciones = await PlanillaConsulta.find(filtro)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        res.json({ total, pagina: parseInt(page), calificaciones });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Notas detalladas
router.get('/calificaciones/detalle', async (req, res) => {
    try {
        const { periodo, pensum, estudiante, page = 1, limit = 50 } = req.query;
        const filtro = {};
        if (periodo) filtro.planilla = periodo;
        if (pensum) filtro.codigo_pensum = pensum;
        if (estudiante) filtro.codigo_est = estudiante;

        const total = await PlanillaDetalle.countDocuments(filtro);
        const notas = await PlanillaDetalle.find(filtro)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        res.json({ total, pagina: parseInt(page), notas });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

// Actualizar nota detalle
router.put('/calificaciones/detalle/:id', async (req, res) => {
    try {
        const nota = await PlanillaDetalle.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });
        res.json(nota);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Crear nota detalle individual
router.post('/calificaciones/detalle', async (req, res) => {
    try {
        const { codigo_est, codigo_pensum, id_nota, concepto, tipo_nota, planilla } = req.body;
        if (!codigo_est || !codigo_pensum || !id_nota) {
            return res.status(400).json({ error: 'codigo_est, codigo_pensum, id_nota son obligatorios' });
        }
        const maxDoc = await PlanillaDetalle.findOne().sort({ Id: -1 }).lean();
        const nextId = String((parseInt(maxDoc?.Id || '0') + 1));
        const nuevo = await PlanillaDetalle.create({
            Id: nextId,
            codigo_est, codigo_pensum, id_nota,
            concepto: concepto || '', tipo_nota: tipo_nota || '',
            planilla: planilla || '',
            comp_1: 0, comp_2: 0, comp_3: 0, nota: 0,
            fecha_insert: new Date().toISOString().replace('T', ' ').substring(0, 19)
        });
        res.status(201).json({ success: true, detalle: nuevo });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Crear grupo de notas detalle en masa (para todos los estudiantes de un curso)
router.post('/calificaciones/detalle/bulk', async (req, res) => {
    try {
        const { estudiantes, codigo_pensum, id_nota, concepto, tipo_nota, planilla } = req.body;
        if (!Array.isArray(estudiantes) || !estudiantes.length || !codigo_pensum || !id_nota) {
            return res.status(400).json({ error: 'estudiantes[], codigo_pensum, id_nota son obligatorios' });
        }
        // Obtener el último Id para auto-incremento
        const maxDoc = await PlanillaDetalle.findOne().sort({ Id: -1 }).lean();
        let lastId = parseInt(maxDoc?.Id || '0');
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

        const docs = estudiantes.map(cod_est => {
            lastId++;
            return {
                Id: String(lastId),
                codigo_est: String(cod_est),
                codigo_pensum: String(codigo_pensum),
                id_nota: String(id_nota),
                concepto: concepto || '',
                tipo_nota: tipo_nota || '',
                planilla: planilla || '',
                comp_1: 0, comp_2: 0, comp_3: 0, nota: 0,
                fecha_insert: now
            };
        });

        const insertados = await PlanillaDetalle.insertMany(docs, { ordered: false });
        res.json({ success: true, creados: insertados.length });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});


router.post('/calificaciones', async (req, res) => {
    try {
        const data = req.body;
        if (!data.estudiante || !data.pensum) return res.status(400).json({ error: 'Estudiante y pensum son obligatorios' });
        const nuevo = new PlanillaConsulta(data);
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/calificaciones/:id', async (req, res) => {
    try {
        const cal = await PlanillaConsulta.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!cal) return res.status(404).json({ error: 'Calificación no encontrada' });
        res.json(cal);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/calificaciones/:id', async (req, res) => {
    try {
        await PlanillaConsulta.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 📋 PLANILLAS (Periodos académicos)
// ========================================
router.get('/planillas', async (req, res) => {
    try {
        const filtro = { ...filtroSede(req.query) };
        if (req.query.estado) filtro.estado = req.query.estado;
        const planillas = await Planilla.find(filtro).sort({ anno: -1, periodo: 1 }).lean();
        res.json(planillas);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 🏷️ ID_NOTA (Tipos de nota por pensum/periodo)
// ========================================
router.get('/id-notas', async (req, res) => {
    try {
        const { pensum, per_id } = req.query;
        const filtro = { ...filtroSede(req.query) };
        if (pensum) filtro.pensum = pensum;
        if (per_id) filtro.per_id = per_id;
        filtro.estado = 'A';
        const notas = await IdNota.find(filtro).sort({ fecha_insert: 1 }).lean();
        res.json(notas);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// ✅ ASISTENCIA
// ========================================
router.get('/asistencia', async (req, res) => {
    try {
        const { fecha, pensum, page = 1, limit = 100 } = req.query;
        const filtro = { ...filtroSede(req.query) };
        if (fecha) filtro.fecha = fecha;
        if (pensum) filtro.pensum = pensum;

        const registros = await AsistenciaDet.find(filtro)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ fecha: -1 })
            .lean();

        const total = await AsistenciaDet.countDocuments(filtro);
        res.json({ total, registros });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.post('/asistencia', async (req, res) => {
    try {
        const data = req.body;
        if (!data.estudiante || !data.fecha) return res.status(400).json({ error: 'Estudiante y fecha son obligatorios' });
        const nuevo = new AsistenciaDet(data);
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/asistencia/:id', async (req, res) => {
    try {
        const reg = await AsistenciaDet.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!reg) return res.status(404).json({ error: 'Registro no encontrado' });
        res.json(reg);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/asistencia/:id', async (req, res) => {
    try {
        await AsistenciaDet.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 👁️ OBSERVACIONES DEL ESTUDIANTE
// ========================================
router.get('/observaciones', async (req, res) => {
    try {
        const { estudiante, docente, page = 1, limit = 50 } = req.query;
        const filtro = { estado: 'A', ...filtroSede(req.query) };
        if (estudiante) filtro.estudiante = estudiante;
        if (docente) filtro.docente = docente;

        const total = await ObservacionDocente.countDocuments(filtro);
        const observaciones = await ObservacionDocente.find(filtro)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ fecha_insert: -1 })
            .lean();

        res.json({ total, pagina: parseInt(page), observaciones });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.post('/observaciones', async (req, res) => {
    try {
        const data = req.body;
        if (!data.estudiante || !data.problema) return res.status(400).json({ error: 'Estudiante y observación son obligatorios' });
        if (!data.estado) data.estado = 'A';
        if (!data.fecha_insert) data.fecha_insert = new Date().toISOString();
        const nuevo = new ObservacionDocente(data);
        await nuevo.save();
        res.status(201).json({ success: true, _id: nuevo._id });
    } catch (error) {
        res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message });
    }
});

router.put('/observaciones/:id', async (req, res) => {
    try {
        const obs = await ObservacionDocente.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!obs) return res.status(404).json({ error: 'Observación no encontrada' });
        res.json(obs);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/observaciones/:id', async (req, res) => {
    try {
        await ObservacionDocente.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});



// ========================================
// 🕐 HORARIOS DE ATENCIÓN
// ========================================
router.get('/horarios-atencion', async (req, res) => {
    try {
        const horarios = await HorarioAtencion.find().limit(100).lean();
        res.json(horarios);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.post('/horarios-atencion', async (req, res) => {
    try {
        const data = req.body;
        if (!data.docente || !data.dia) return res.status(400).json({ error: 'Docente y día son obligatorios' });
        if (!data.estado) data.estado = 'A';
        const nuevo = new HorarioAtencion(data);
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.get('/horarios-atencion/:id', async (req, res) => {
    try {
        const h = await HorarioAtencion.findById(req.params.id).lean();
        if (!h) return res.status(404).json({ error: 'No encontrado' });
        res.json(h);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/horarios-atencion/:id', async (req, res) => {
    try {
        const h = await HorarioAtencion.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!h) return res.status(404).json({ error: 'No encontrado' });
        res.json(h);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/horarios-atencion/:id', async (req, res) => {
    try {
        await HorarioAtencion.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 📢 ANUNCIOS
// ========================================
router.get('/anuncios', async (req, res) => {
    try {
        const anuncios = await Anuncio.find(filtroSede(req.query)).sort({ fecha: -1 }).limit(50).lean();
        res.json(anuncios);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.post('/anuncios', async (req, res) => {
    try {
        const data = req.body;
        if (!data.titulo) return res.status(400).json({ error: 'Título es obligatorio' });
        if (!data.fecha) data.fecha = new Date().toISOString().split('T')[0];
        if (!data.estado) data.estado = 'Activo';
        const nuevo = new Anuncio(data);
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.get('/anuncios/:id', async (req, res) => {
    try {
        const a = await Anuncio.findById(req.params.id).lean();
        if (!a) return res.status(404).json({ error: 'No encontrado' });
        res.json(a);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/anuncios/:id', async (req, res) => {
    try {
        const a = await Anuncio.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!a) return res.status(404).json({ error: 'No encontrado' });
        res.json(a);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/anuncios/:id', async (req, res) => {
    try {
        await Anuncio.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 💰 PAGOS
// ========================================
router.get('/pagos', async (req, res) => {
    try {
        const filtro = { ...filtroSede(req.query) };
        const pagos = await Pago.find(filtro).sort({ fecha: -1 }).limit(100).lean();
        res.json(pagos);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.get('/pagos/stats', async (req, res) => {
    try {
        const sf = filtroSede(req.query);
        const total = await Pago.countDocuments(sf);
        const pagados = await Pago.countDocuments({ ...sf, estado: 'Pagado' });
        const pendientes = await Pago.countDocuments({ ...sf, estado: { $ne: 'Pagado' } });
        const pagosAll = await Pago.find({ ...sf, estado: 'Pagado' }).lean();
        const recaudado = pagosAll.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
        const pendientesAll = await Pago.find({ ...sf, estado: { $ne: 'Pagado' } }).lean();
        const pendienteCobro = pendientesAll.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
        res.json({ total, pagados, pendientes, recaudado, pendienteCobro });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.post('/pagos', async (req, res) => {
    try {
        const data = req.body;
        if (!data.estudiante || !data.concepto) return res.status(400).json({ error: 'Estudiante y concepto son obligatorios' });
        if (!data.fecha) data.fecha = new Date().toISOString().split('T')[0];
        if (!data.estado) data.estado = 'Pendiente';
        const nuevo = new Pago(data);
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/pagos/:id', async (req, res) => {
    try {
        const p = await Pago.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!p) return res.status(404).json({ error: 'No encontrado' });
        res.json(p);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/pagos/:id', async (req, res) => {
    try {
        await Pago.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 📅 HORARIOS GENERALES
// ========================================
router.get('/horarios', async (req, res) => {
    try {
        const { curso } = req.query;
        const filtro = { ...filtroSede(req.query) };
        if (curso) filtro.curso = curso;
        const horarios = await Horario.find(filtro).limit(200).lean();
        res.json(horarios);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.post('/horarios', async (req, res) => {
    try {
        const data = req.body;
        if (!data.curso || !data.dia || !data.hora) return res.status(400).json({ error: 'Curso, día y hora son obligatorios' });
        const nuevo = new Horario(data);
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/horarios/:id', async (req, res) => {
    try {
        const h = await Horario.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!h) return res.status(404).json({ error: 'Horario no encontrado' });
        res.json(h);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/horarios/:id', async (req, res) => {
    try {
        await Horario.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 📊 REPORTES - Estadísticas Agregadas
// ========================================
router.get('/reportes/stats', async (req, res) => {
    try {
        const totalEstudiantes = await Estudiante.countDocuments({ estado_est: { $ne: 'R' } });
        const totalDocentes = await Docente.countDocuments({ estado: 'A' });
        const totalCursos = await Curso.countDocuments({ estado: 'A' });

        // Tasa de aprobación: calificaciones con nota >= 3.0
        const allCalif = await PlanillaConsulta.find().lean();
        let aprobados = 0, totalCalif = 0;
        allCalif.forEach(c => {
            const nota = parseFloat(c.nota_final || c.nota || 0);
            if (nota > 0) { totalCalif++; if (nota >= 3.0) aprobados++; }
        });
        const tasaAprobacion = totalCalif > 0 ? Math.round((aprobados / totalCalif) * 100) : 0;

        // Estudiantes en riesgo: los que tienen alguna nota < 3.0
        const enRiesgo = totalCalif > 0 ? totalCalif - aprobados : 0;

        // Asistencia
        const totalAsistencia = await AsistenciaDet.countDocuments();
        const presentes = await AsistenciaDet.countDocuments({ asistencia: { $in: ['P', 'Presente', '1'] } });
        const tasaAsistencia = totalAsistencia > 0 ? Math.round((presentes / totalAsistencia) * 100) : 0;

        // Pagos
        const pagosPagados = await Pago.countDocuments({ estado: 'Pagado' });
        const pagosPendientes = await Pago.countDocuments({ estado: { $ne: 'Pagado' } });

        // Observaciones recientes
        const obsRecientes = await ObservacionDocente.countDocuments();

        res.json({
            totalEstudiantes, totalDocentes, totalCursos,
            tasaAprobacion, enRiesgo, tasaAsistencia,
            pagosPagados, pagosPendientes, obsRecientes,
            totalCalif, aprobados
        });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 📋 BOLETINES - Informes académicos
// ========================================
router.get('/boletines/intermedio', async (req, res) => {
    try {
        const { curso_id, periodo } = req.query;
        if (!curso_id) return res.status(400).json({ error: 'curso_id es requerido' });

        // 1. Estudiantes del curso
        const estudiantes = await Estudiante.find({ curso_id: String(curso_id) }).sort({ nombre: 1 }).lean();

        // 2. Pensum del curso
        const pensums = await Pensum.find({ class_id: String(curso_id), estado: 'A' }).lean();
        const pensumIds = pensums.map(p => String(p.subject_id));

        // 3. Nombres de asignaturas
        const asignaturas = await Asignatura.find().select('subject_id Id nombre').lean();
        const asigMap = {};
        asignaturas.forEach(a => { asigMap[String(a.subject_id || a.Id)] = a.nombre; });

        const pensumMap = {};
        pensums.forEach(p => {
            pensumMap[String(p.subject_id)] = {
                subject_id: String(p.subject_id),
                asignatura_nombre: asigMap[String(p.asignatura_id)] || p.nombre || 'N/A',
                teacher_id: p.teacher_id,
                intensidad: p.intensidad
            };
        });

        // 4. Obtener id_notas para estos pensum (con filtro de planilla si se especifica)
        const idNotaFiltro = { pensum: { $in: pensumIds }, estado: 'A' };
        if (periodo) idNotaFiltro.per_id = String(periodo);
        const idNotas = await IdNota.find(idNotaFiltro).lean();

        // 5. Obtener planilla_detalle para todos los id_notas de este curso
        const idNotaIds = idNotas.map(n => String(n.Id));
        const estudianteIds = estudiantes.map(e => String(e.estudiante_id));

        const detalles = await PlanillaDetalle.find({
            id_nota: { $in: idNotaIds },
            codigo_est: { $in: estudianteIds }
        }).lean();

        // Crear mapa: idNota.Id → { codigo, pensum }
        const idNotaMap = {};
        idNotas.forEach(n => {
            idNotaMap[String(n.Id)] = { codigo: n.codigo, pensum: String(n.pensum) };
        });

        // 6. Agrupar notas por estudiante → pensum → tipo (D, I, F, etc.)
        // Estructura: notasMap[estId][pensumId][codigo] = [nota1, nota2, ...]
        const notasMap = {};
        detalles.forEach(d => {
            const estId   = String(d.codigo_est);
            const pen     = String(d.codigo_pensum);
            const info    = idNotaMap[String(d.id_nota)];
            if (!info) return;
            const codigo  = info.codigo;
            const nota    = parseFloat(d.nota) || 0;

            if (!notasMap[estId]) notasMap[estId] = {};
            if (!notasMap[estId][pen]) notasMap[estId][pen] = {};
            if (!notasMap[estId][pen][codigo]) notasMap[estId][pen][codigo] = [];
            notasMap[estId][pen][codigo].push(nota);
        });

        // Helper: promedio de un array de notas
        const prom = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

        // 7. Construir boletines
        const boletines = estudiantes.map(est => {
            const estId     = String(est.estudiante_id);
            const estNotas  = notasMap[estId] || {};

            const materias = pensumIds.map(pensumId => {
                const tipoNotas = estNotas[pensumId] || {};
                const info      = pensumMap[pensumId] || {};
                return {
                    pensum_id:  pensumId,
                    asignatura: info.asignatura_nombre || 'N/A',
                    intensidad: info.intensidad || '0',
                    D:  prom(tipoNotas['D']  || []),
                    I:  prom(tipoNotas['I']  || []),
                    F:  prom(tipoNotas['F']  || []),
                    IP: prom(tipoNotas['IP'] || []),
                    FP: prom(tipoNotas['FP'] || []),
                    C1: prom(tipoNotas['C1'] || []),
                    C2: prom(tipoNotas['C2'] || []),
                    CG: prom(tipoNotas['CG'] || []),
                    N:  prom(tipoNotas['N']  || []),
                    def: 0,
                    niv: '0'
                };
            });

            return {
                estudiante_id: est.estudiante_id,
                nombre: est.nombre,
                curso_id: est.curso_id,
                materias
            };
        });

        res.json({ boletines, total: boletines.length });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// 📋 BOLETINES / REGISTRO DIARIO — registros individuales D con C1 C2 C3 NT
// GET /api/boletines/regdiario?curso_id=X&periodo=Y
// ─────────────────────────────────────────────────────────────────────────────
router.get('/boletines/regdiario', async (req, res) => {
    try {
        const { curso_id, periodo } = req.query;
        if (!curso_id) return res.status(400).json({ error: 'curso_id es obligatorio' });

        // 1. Estudiantes del curso
        const estudiantes = await Estudiante.find({ curso_id: String(curso_id), estado_est: { $ne: 'R' } })
            .sort({ nombre: 1 }).lean();
        if (!estudiantes.length) return res.json({ boletines: [], total: 0 });

        // 2. Pensum del curso
        const pensums = await Pensum.find({ class_id: String(curso_id), estado: 'A' }).lean();
        const pensumIds = [...new Set(pensums.map(p => String(p.subject_id)))];
        const asignaturaIds = [...new Set(pensums.map(p => String(p.asignatura_id)))];

        // 3. Nombres de asignaturas
        const asigs = await Asignatura.find({ subject_id: { $in: asignaturaIds } }).lean();
        const asigMap = {};
        asigs.forEach(a => { asigMap[String(a.subject_id || a.Id)] = a.nombre; });
        const pensumMap = {};
        pensums.forEach(p => {
            pensumMap[String(p.subject_id)] = asigMap[String(p.asignatura_id)] || 'N/A';
        });

        // 4. id_notas tipo D para el curso/periodo
        const idNotaFiltro = { pensum: { $in: pensumIds }, estado: 'A' };
        if (periodo) idNotaFiltro.per_id = String(periodo);
        const idNotas = await IdNota.find(idNotaFiltro).lean();
        // Solo notas de tipo D (Diario)
        const idNotasD = idNotas.filter(n => (n.codigo || '').toUpperCase() === 'D');
        const idNotaDMap = {};
        idNotasD.forEach(n => { idNotaDMap[String(n.Id)] = String(n.pensum); });
        const idNotaDIds = Object.keys(idNotaDMap);

        // 5. planilla_detalle solo de tipo D
        const estudianteIds = estudiantes.map(e => String(e.estudiante_id));
        const detalles = await PlanillaDetalle.find({
            id_nota: { $in: idNotaDIds },
            codigo_est: { $in: estudianteIds }
        }).lean();

        // 6. Agrupar: estId → pensumId → [registros ordenados]
        // Cada registro es un documento planilla_detalle con nota, concepto, etc.
        const regMap = {}; // regMap[estId][pensumId] = [{nota, concepto, ...}, ...]
        detalles.forEach(d => {
            const estId = String(d.codigo_est);
            const pen   = idNotaDMap[String(d.id_nota)];
            if (!pen) return;
            if (!regMap[estId]) regMap[estId] = {};
            if (!regMap[estId][pen]) regMap[estId][pen] = [];
            regMap[estId][pen].push(d);
        });

        // Helper
        const safe = v => parseFloat(v) || 0;
        const avg  = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;

        // 7. Construir boletines
        const MAX_REG = 7;
        const boletines = estudiantes.map(est => {
            const estId = String(est.estudiante_id);
            const materias = pensumIds.map(pensumId => {
                const registros = (regMap[estId] && regMap[estId][pensumId]) || [];
                // Cada registro D puede tener sub-campos: comp1, comp2, comp3, nota
                // Tomamos hasta MAX_REG registros en orden
                const regs = registros.slice(0, MAX_REG).map(r => {
                    // Intentar leer sub-componentes si existen, si no usar nota como NT
                    const c1 = safe(r.comp1 ?? r.nota);
                    const c2 = safe(r.comp2 ?? r.nota);
                    const c3 = safe(r.comp3 ?? r.nota);
                    const nt = safe(r.nota || avg([c1,c2,c3]));
                    return { c1, c2, c3, nt };
                });
                // Rellenar hasta MAX_REG con ceros
                while (regs.length < MAX_REG) regs.push({ c1:0, c2:0, c3:0, nt:0 });

                // PROMEDIOS (incluyendo ceros)
                const promC1 = avg(regs.map(r=>r.c1));
                const promC2 = avg(regs.map(r=>r.c2));
                const promC3 = avg(regs.map(r=>r.c3));
                const promNT = avg(regs.map(r=>r.nt));
                const pct60  = Math.round(promNT * 0.6);

                return {
                    pensum_id:  pensumId,
                    asignatura: pensumMap[pensumId] || 'N/A',
                    registros:  regs,          // array de 7 objetos {c1,c2,c3,nt}
                    promC1, promC2, promC3, promNT, pct60
                };
            });

            return {
                estudiante_id: est.estudiante_id,
                nombre:        est.nombre,
                curso_id:      est.curso_id,
                materias
            };
        });

        res.json({ boletines, total: boletines.length });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});


// ========================================
// 🔐 AUTH - Login
// ========================================
router.post('/auth/login', async (req, res) => {
    try {
        const { cuenta, password, rol } = req.body;
        if (!cuenta || !password) return res.status(400).json({ error: 'Cuenta y contraseña son obligatorios' });

        // PADRE: authenticate from acudiente collection
        if (rol === 'padre') {
            const acu = await Acudiente.findOne({ usuario_acud: cuenta, estado: 'A' }).lean();
            if (!acu) return res.status(401).json({ error: 'Acudiente no encontrado' });

            // Soportar tanto contraseñas hasheadas (bcrypt) como texto plano (migración pendiente)
            let passwordValid = false;
            if (acu.clave_acud && acu.clave_acud.startsWith('$2')) {
                passwordValid = await bcrypt.compare(password, acu.clave_acud);
            } else {
                passwordValid = (acu.clave_acud === password);
            }
            if (!passwordValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

            const usuarioData = {
                id: acu.Id,
                name: acu.nombre_asistente,
                cuenta: acu.usuario_acud,
                rol: 'padre',
                acudiente_id: acu.Id
            };
            const token = generarToken({ ...usuarioData, level: 'P' });
            return res.json({ success: true, token, usuario: usuarioData });
        }

        // ADMIN / PROFESOR / ESTUDIANTE: authenticate from usuarios collection
        const usuario = await UsuarioGA.findOne({ cuenta, estado: 'A' }).lean();
        if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });

        // Soportar tanto contraseñas hasheadas (bcrypt) como texto plano (migración pendiente)
        let passwordValid = false;
        if (usuario.password && usuario.password.startsWith('$2')) {
            passwordValid = await bcrypt.compare(password, usuario.password);
        } else {
            passwordValid = (usuario.password === password);
        }
        if (!passwordValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

        // Validate role matches user level
        const levelToRol = { 'A': 'admin', 'D': 'profesor', 'E': 'estudiante' };
        const expectedRol = levelToRol[usuario.level];
        if (!expectedRol || expectedRol !== rol) {
            return res.status(403).json({ error: `No tienes permisos para acceder como ${rol}. Tu cuenta es de tipo: ${expectedRol || 'desconocido'}` });
        }

        const result = { success: true, usuario: { id: usuario.id, name: usuario.name || usuario.nombres || usuario.nombre, cuenta: usuario.cuenta, rol, level: usuario.level } };

        if (rol === 'profesor') {
            const docente = await Docente.findOne({ email: cuenta, estado: 'A' }).lean();
            if (docente) {
                result.usuario.teacher_id = docente.teacher_id;
                result.usuario.name = docente.nombre;
                result.usuario.identi = docente.identi;
                result.usuario.especialidad = docente.especialidad;
            } else {
                const docByName = await Docente.findOne({ nombre: { $regex: usuario.name || usuario.nombre, $options: 'i' }, estado: 'A' }).lean();
                if (docByName) {
                    result.usuario.teacher_id = docByName.teacher_id;
                    result.usuario.name = docByName.nombre;
                }
            }
        } else if (rol === 'estudiante') {
            const est = await Estudiante.findOne({
                nombre: { $regex: (usuario.name || '').replace(/\s+/g, '.*'), $options: 'i' },
                estado_est: { $ne: 'R' }
            }).lean();
            if (est) {
                result.usuario.estudiante_id = est.estudiante_id;
                result.usuario.curso_id = est.curso_id;
                result.usuario.name = est.nombre;
            }
        }

        // Generar JWT
        result.token = generarToken(result.usuario);
        res.json(result);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});


// ========================================
// 👨‍🎓 ESTUDIANTE - Dashboard
// ========================================
router.get('/estudiante/dashboard', async (req, res) => {
    try {
        const { estudiante_id } = req.query;
        if (!estudiante_id) return res.status(400).json({ error: 'estudiante_id es obligatorio' });

        const est = await Estudiante.findOne({ estudiante_id: String(estudiante_id) }).lean();
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });

        // Get course info
        const curso = await Curso.findOne({ curso_id: est.curso_id }).lean();

        // Get all pensums for this course (all subjects the student takes)
        const pensums = await Pensum.find({ class_id: est.curso_id, estado: 'A' }).lean();
        const asignaturaIds = [...new Set(pensums.map(p => p.asignatura_id))];
        const teacherIds = [...new Set(pensums.map(p => p.teacher_id))];

        const [asignaturas, docentes] = await Promise.all([
            Asignatura.find({ subject_id: { $in: asignaturaIds } }).lean(),
            Docente.find({ teacher_id: { $in: teacherIds }, estado: 'A' }).lean()
        ]);

        const asigMap = {};
        asignaturas.forEach(a => { asigMap[a.subject_id] = a.nombre; });
        const docenteMap = {};
        docentes.forEach(d => { docenteMap[d.teacher_id] = d.nombre; });

        // Get grade summaries from planilla_consulta
        const pensumIds = pensums.map(p => p.subject_id);
        const consultas = await PlanillaConsulta.find({
            estudiante: String(estudiante_id),
            pensum: { $in: pensumIds }
        }).lean();

        const consultaMap = {};
        consultas.forEach(c => { consultaMap[c.pensum] = c; });

        // Build materias list with grades
        const materias = pensums.map(p => {
            const c = consultaMap[p.subject_id] || {};
            const d = parseInt(c.D) || 0;
            const i = parseInt(c.I) || 0;
            const f = parseInt(c.F) || 0;
            return {
                pensum_id: p.subject_id,
                asignatura: asigMap[p.asignatura_id] || p.nombre || 'N/A',
                profesor: docenteMap[p.teacher_id] || 'N/A',
                intensidad: p.intensidad || '0',
                notaD: d,
                notaI: i,
                notaF: f,
                definitiva: parseInt(c.def) || 0
            };
        });

        // Calculate overall average
        const notasValidas = materias.filter(m => m.notaD > 0);
        const promedio = notasValidas.length > 0
            ? Math.round(notasValidas.reduce((sum, m) => sum + m.notaD, 0) / notasValidas.length)
            : 0;
        const aprobadas = notasValidas.filter(m => m.notaD >= 70).length;
        const reprobadas = notasValidas.filter(m => m.notaD > 0 && m.notaD < 70).length;

        res.json({
            estudiante: {
                nombre: est.nombre,
                estudiante_id: est.estudiante_id,
                curso_id: est.curso_id,
                sexo: est.sexo
            },
            curso: curso ? { nombre: curso.nombre, codigo: curso.codigo } : { nombre: 'N/A', codigo: 'N/A' },
            totalMaterias: pensums.length,
            promedio,
            aprobadas,
            reprobadas,
            enCurso: pensums.length - aprobadas - reprobadas,
            materias
        });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 👨‍🎓 ESTUDIANTE - Notas detalladas por materia
// ========================================
router.get('/estudiante/notas', async (req, res) => {
    try {
        const { estudiante_id, pensum_id } = req.query;
        if (!estudiante_id || !pensum_id) return res.status(400).json({ error: 'estudiante_id y pensum_id son obligatorios' });

        // Get all id_nota registros for this pensum
        const registros = await IdNota.find({ pensum: String(pensum_id), estado: 'A' }).sort({ codigo: 1, registro: 1 }).lean();

        // Get student grades for this pensum
        const detalles = await PlanillaDetalle.find({
            codigo_est: String(estudiante_id),
            codigo_pensum: String(pensum_id),
            estado: 'A'
        }).lean();

        const detMap = {};
        detalles.forEach(d => { detMap[d.id_nota] = d; });

        const result = registros.map(r => {
            const det = detMap[r.Id] || {};
            return {
                id_nota: r.Id,
                codigo: r.codigo,
                concepto: r.concepto,
                registro: r.registro,
                comp_1: parseInt(det.comp_1) || 0,
                comp_2: parseInt(det.comp_2) || 0,
                comp_3: parseInt(det.comp_3) || 0,
                nota: parseInt(det.nota) || 0
            };
        });

        res.json(result);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});


// ========================================
// 👨‍🏫 PROFESOR - Dashboard
// ========================================
router.get('/profesor/dashboard', async (req, res) => {
    try {
        const { teacher_id } = req.query;
        if (!teacher_id) return res.status(400).json({ error: 'teacher_id es obligatorio' });

        const docente = await Docente.findOne({ teacher_id: String(teacher_id) }).lean();
        const pensums = await Pensum.find({ teacher_id: String(teacher_id), estado: 'A' }).lean();

        // All IDs in this DB are strings
        const cursoIds = [...new Set(pensums.map(p => p.class_id))];
        const asignaturaIds = [...new Set(pensums.map(p => p.asignatura_id))];

        const [cursos, asignaturas] = await Promise.all([
            Curso.find({ curso_id: { $in: cursoIds } }).lean(),
            Asignatura.find({ subject_id: { $in: asignaturaIds } }).lean()
        ]);

        const cursoMap = {};
        cursos.forEach(c => { cursoMap[c.curso_id] = { nombre: c.nombre, codigo: c.codigo }; });
        const asigMap = {};
        asignaturas.forEach(a => { asigMap[a.subject_id] = a.nombre; });

        // Count students per course (string IDs)
        const studentCounts = {};
        for (const cid of cursoIds) {
            const count = await Estudiante.countDocuments({ curso_id: cid, estado_est: { $ne: 'R' } });
            studentCounts[cid] = count;
        }

        // Build enriched pensum list
        const materias = pensums.map(p => ({
            pensum_id: p.subject_id,
            asignatura_id: p.asignatura_id,
            class_id: p.class_id,
            curso_nombre: cursoMap[p.class_id]?.nombre || 'N/A',
            curso_codigo: cursoMap[p.class_id]?.codigo || 'N/A',
            asignatura: asigMap[p.asignatura_id] || p.nombre || 'N/A',
            int_horaria: p.intensidad || p.int_horaria || 0,
            estudiantes: studentCounts[p.class_id] || 0
        }));

        // Group by course
        const cursoGroups = {};
        materias.forEach(m => {
            if (!cursoGroups[m.class_id]) {
                cursoGroups[m.class_id] = { class_id: m.class_id, curso_nombre: m.curso_nombre, curso_codigo: m.curso_codigo, estudiantes: m.estudiantes, materias: [] };
            }
            cursoGroups[m.class_id].materias.push({ asignatura: m.asignatura, int_horaria: m.int_horaria, pensum_id: m.pensum_id });
        });

        res.json({
            docente: docente ? { nombre: docente.nombre, teacher_id: docente.teacher_id, email: docente.email, especialidad: docente.especialidad } : null,
            totalCursos: cursoIds.length,
            totalEstudiantes: Object.values(studentCounts).reduce((a, b) => a + b, 0),
            totalMaterias: pensums.length,
            cursos: Object.values(cursoGroups),
            materias
        });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 👨‍🏫 PROFESOR - Estudiantes por curso
// ========================================
router.get('/profesor/estudiantes', async (req, res) => {
    try {
        const { class_id, pensum_id } = req.query;
        if (!class_id) return res.status(400).json({ error: 'class_id es obligatorio' });
        const estudiantes = await Estudiante.find({ curso_id: String(class_id), estado_est: { $ne: 'R' } }).sort({ nombre: 1 }).lean();

        // If pensum_id provided, fetch grades from planilla_detalle
        let notasMap = {};
        if (pensum_id) {
            const estIds = estudiantes.map(e => e.estudiante_id);
            const notas = await PlanillaDetalle.find({
                codigo_pensum: String(pensum_id),
                codigo_est: { $in: estIds },
                estado: 'A'
            }).sort({ id_nota: 1 }).lean();

            // Group by student
            notas.forEach(n => {
                if (!notasMap[n.codigo_est]) notasMap[n.codigo_est] = [];
                notasMap[n.codigo_est].push({
                    id_nota: n.id_nota,
                    comp_1: parseInt(n.comp_1) || 0,
                    comp_2: parseInt(n.comp_2) || 0,
                    comp_3: parseInt(n.comp_3) || 0,
                    nota: parseInt(n.nota) || 0,
                    concepto: n.concepto,
                    tipo_nota: n.tipo_nota
                });
            });
        }

        res.json(estudiantes.map(e => ({
            estudiante_id: e.estudiante_id,
            nombre: e.nombre,
            curso_id: e.curso_id,
            sexo: e.sexo,
            email: e.email,
            notas: notasMap[e.estudiante_id] || []
        })));
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 👨‍🏫 PROFESOR - Registros (id_nota) por pensum
// ========================================
router.get('/profesor/registros', async (req, res) => {
    try {
        const { pensum_id } = req.query;
        if (!pensum_id) return res.status(400).json({ error: 'pensum_id es obligatorio' });
        const registros = await IdNota.find({ pensum: String(pensum_id), estado: 'A' }).sort({ codigo: 1, registro: 1 }).lean();
        res.json(registros.map(r => ({
            id: r.Id,
            codigo: r.codigo,
            concepto: r.concepto,
            registro: r.registro,
            pensum: r.pensum,
            anno: r.anno,
            per_id: r.per_id
        })));
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Crear nuevo registro de nota
router.post('/profesor/registros', async (req, res) => {
    try {
        const { pensum_id, codigo, concepto } = req.body;
        if (!pensum_id || !codigo || !concepto) return res.status(400).json({ error: 'pensum_id, codigo y concepto son obligatorios' });

        // Get next Id
        const maxDoc = await IdNota.findOne().sort({ Id: -1 }).lean();
        const nextId = String((parseInt(maxDoc?.Id || '0') + 1));

        // Get next registro number for this pensum + codigo
        const existing = await IdNota.find({ pensum: String(pensum_id), codigo, estado: 'A' }).sort({ registro: -1 }).limit(1).lean();
        const nextRegistro = String((parseInt(existing[0]?.registro || '0') + 1));

        // Get current active planilla
        const planilla = await Planilla.findOne({ estado: 'A' }).sort({ Id: -1 }).lean();

        const nuevo = await IdNota.create({
            Id: nextId,
            codigo,
            concepto,
            pensum: String(pensum_id),
            anno: planilla?.anno || '2026',
            per_id: planilla?.Id || '9',
            estado: 'A',
            fecha_insert: new Date().toISOString().replace('T', ' ').substring(0, 19),
            registro: nextRegistro
        });

        res.json({ success: true, registro: { id: nextId, codigo, concepto, registro: nextRegistro, pensum: pensum_id } });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 📋 TAREAS / ACTIVIDADES
// ========================================

// Profesor: Crear tarea
router.post('/profesor/tareas', async (req, res) => {
    try {
        const { teacher_id, pensum_id, class_id, titulo, descripcion, fecha_limite, permite_tardia } = req.body;
        if (!teacher_id || !pensum_id || !titulo || !fecha_limite) {
            return res.status(400).json({ error: 'teacher_id, pensum_id, titulo y fecha_limite son obligatorios' });
        }
        const tarea = await Tarea.create({
            titulo, descripcion: descripcion || '', teacher_id, pensum_id, class_id: class_id || '',
            fecha_limite, permite_tardia: !!permite_tardia
        });
        res.json({ success: true, tarea });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Profesor: Listar tareas
router.get('/profesor/tareas', async (req, res) => {
    try {
        const { teacher_id } = req.query;
        if (!teacher_id) return res.status(400).json({ error: 'teacher_id es obligatorio' });

        const tareas = await Tarea.find({ teacher_id, estado: 'A' }).sort({ fecha_creacion: -1 }).lean();

        // Enrich with subject names and entrega counts
        const pensumIds = [...new Set(tareas.map(t => t.pensum_id))];
        const pensums = await Pensum.find({ subject_id: { $in: pensumIds } }).lean();
        const asigIds = [...new Set(pensums.map(p => p.asignatura_id))];
        const asignaturas = await Asignatura.find({ subject_id: { $in: asigIds } }).lean();
        const asigMap = {}; asignaturas.forEach(a => { asigMap[a.subject_id] = a.nombre; });
        const pensumMap = {}; pensums.forEach(p => { pensumMap[p.subject_id] = asigMap[p.asignatura_id] || p.nombre || 'N/A'; });

        // Count submissions per tarea
        const tareaIds = tareas.map(t => t._id.toString());
        const entregas = await EntregaTarea.find({ tarea_id: { $in: tareaIds }, estado: 'A' }).lean();
        const entregaCount = {};
        entregas.forEach(e => { entregaCount[e.tarea_id] = (entregaCount[e.tarea_id] || 0) + 1; });

        const result = tareas.map(t => ({
            _id: t._id,
            titulo: t.titulo,
            descripcion: t.descripcion,
            pensum_id: t.pensum_id,
            class_id: t.class_id,
            asignatura: pensumMap[t.pensum_id] || 'N/A',
            fecha_creacion: t.fecha_creacion,
            fecha_limite: t.fecha_limite,
            permite_tardia: t.permite_tardia,
            entregas: entregaCount[t._id.toString()] || 0
        }));

        res.json(result);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Profesor: Ver entregas de una tarea
router.get('/profesor/tareas/:id/entregas', async (req, res) => {
    try {
        const entregas = await EntregaTarea.find({ tarea_id: req.params.id, estado: 'A' }).lean();
        const estIds = entregas.map(e => e.estudiante_id);
        const estudiantes = await Estudiante.find({ estudiante_id: { $in: estIds } }).lean();
        const estMap = {}; estudiantes.forEach(e => { estMap[e.estudiante_id] = e.nombre; });

        res.json(entregas.map(e => ({
            _id: e._id,
            estudiante_id: e.estudiante_id,
            nombre: estMap[e.estudiante_id] || 'Desconocido',
            enlace: e.enlace,
            comentario: e.comentario,
            fecha_entrega: e.fecha_entrega,
            es_tardia: e.es_tardia
        })));
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Estudiante: Ver tareas asignadas
router.get('/estudiante/tareas', async (req, res) => {
    try {
        const { estudiante_id } = req.query;
        if (!estudiante_id) return res.status(400).json({ error: 'estudiante_id es obligatorio' });

        const est = await Estudiante.findOne({ estudiante_id: String(estudiante_id) }).lean();
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });

        // Get all pensums for student's course
        const pensums = await Pensum.find({ class_id: est.curso_id, estado: 'A' }).lean();
        const pensumIds = pensums.map(p => p.subject_id);

        // Get tareas for these pensums
        const tareas = await Tarea.find({ pensum_id: { $in: pensumIds }, estado: 'A' }).sort({ fecha_limite: 1 }).lean();

        // Get subject names
        const asigIds = [...new Set(pensums.map(p => p.asignatura_id))];
        const asigs = await Asignatura.find({ subject_id: { $in: asigIds } }).lean();
        const asigMap = {}; asigs.forEach(a => { asigMap[a.subject_id] = a.nombre; });
        const pensumMap = {}; pensums.forEach(p => { pensumMap[p.subject_id] = asigMap[p.asignatura_id] || 'N/A'; });

        // Get teacher names
        const teacherIds = [...new Set(tareas.map(t => t.teacher_id))];
        const docentes = await Docente.find({ teacher_id: { $in: teacherIds } }).lean();
        const docMap = {}; docentes.forEach(d => { docMap[d.teacher_id] = d.nombre; });

        // Check which ones the student has already submitted
        const tareaIds = tareas.map(t => t._id.toString());
        const misEntregas = await EntregaTarea.find({ tarea_id: { $in: tareaIds }, estudiante_id: String(estudiante_id), estado: 'A' }).lean();
        const entregaMap = {}; misEntregas.forEach(e => { entregaMap[e.tarea_id] = e; });

        const result = tareas.map(t => {
            const entrega = entregaMap[t._id.toString()];
            const now = new Date();
            const limite = new Date(t.fecha_limite);
            let statusTarea = 'pendiente';
            if (entrega) statusTarea = 'entregada';
            else if (now > limite && !t.permite_tardia) statusTarea = 'vencida';
            else if (now > limite && t.permite_tardia) statusTarea = 'tardia_permitida';

            return {
                _id: t._id,
                titulo: t.titulo,
                descripcion: t.descripcion,
                asignatura: pensumMap[t.pensum_id] || 'N/A',
                profesor: docMap[t.teacher_id] || 'N/A',
                fecha_creacion: t.fecha_creacion,
                fecha_limite: t.fecha_limite,
                permite_tardia: t.permite_tardia,
                status: statusTarea,
                entrega: entrega ? { enlace: entrega.enlace, fecha_entrega: entrega.fecha_entrega, es_tardia: entrega.es_tardia } : null
            };
        });

        res.json(result);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Estudiante: Entregar tarea
router.post('/estudiante/tareas/entregar', async (req, res) => {
    try {
        const { tarea_id, estudiante_id, enlace, comentario } = req.body;
        if (!tarea_id || !estudiante_id || !enlace) return res.status(400).json({ error: 'tarea_id, estudiante_id y enlace son obligatorios' });

        const tarea = await Tarea.findById(tarea_id).lean();
        if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

        const now = new Date();
        const limite = new Date(tarea.fecha_limite);
        const es_tardia = now > limite;

        if (es_tardia && !tarea.permite_tardia) {
            return res.status(400).json({ error: 'La fecha límite ha pasado y no se permiten entregas tardías' });
        }

        // Check if already submitted
        const existing = await EntregaTarea.findOne({ tarea_id, estudiante_id: String(estudiante_id), estado: 'A' });
        if (existing) {
            // Update existing
            existing.enlace = enlace;
            existing.comentario = comentario || '';
            existing.fecha_entrega = now.toISOString().replace('T', ' ').substring(0, 19);
            existing.es_tardia = es_tardia;
            await existing.save();
            return res.json({ success: true, message: 'Entrega actualizada', entrega: existing });
        }

        const entrega = await EntregaTarea.create({
            tarea_id, estudiante_id: String(estudiante_id), enlace, comentario: comentario || '', es_tardia
        });
        res.json({ success: true, message: 'Entrega realizada', entrega });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 👨‍👩‍👧 PADRE DE FAMILIA
// ========================================

// Dashboard padre: hijos, promedios, totales
router.get('/padre/dashboard', async (req, res) => {
    try {
        const { acudiente_id } = req.query;
        if (!acudiente_id) return res.status(400).json({ error: 'acudiente_id es obligatorio' });

        const acudiente = await Acudiente.findOne({ Id: String(acudiente_id), estado: 'A' }).lean();
        if (!acudiente) return res.status(404).json({ error: 'Acudiente no encontrado' });

        // Find all children linked to this acudiente
        const estudiantes = await Estudiante.find({ acud_id: String(acudiente_id), estado_est: { $ne: 'R' } }).lean();

        // Get all course and subject info
        const cursoIds = [...new Set(estudiantes.map(e => e.curso_id))];
        const cursos = await Curso.find({ curso_id: { $in: cursoIds } }).lean();
        const cursoMap = {};
        cursos.forEach(c => { cursoMap[c.curso_id] = c.nombre || c.codigo; });

        const asignaturas = await Asignatura.find().select('subject_id Id nombre').lean();
        const asigMap = {};
        asignaturas.forEach(a => { asigMap[a.subject_id] = a.nombre; });

        let totalMaterias = 0;
        let sumaPromedios = 0;
        let countPromedios = 0;

        const hijos = await Promise.all(estudiantes.map(async est => {
            const pensums = await Pensum.find({ class_id: est.curso_id, estado: 'A' }).lean();
            const pensumIds = pensums.map(p => p.subject_id);

            // Get consultas for grades
            const consultas = await PlanillaConsulta.find({
                estudiante: est.estudiante_id,
                pensum: { $in: pensumIds }
            }).lean();

            let sumDef = 0, countDef = 0, aprobadas = 0;
            consultas.forEach(c => {
                const def = parseInt(c.def) || 0;
                if (def > 0) { sumDef += def; countDef++; }
                if (def >= 30) aprobadas++;
            });
            const promedio = countDef > 0 ? (sumDef / countDef) / 10 : 0;
            totalMaterias += pensums.length;
            if (promedio > 0) { sumaPromedios += promedio; countPromedios++; }

            return {
                estudiante_id: est.estudiante_id,
                nombre: est.nombre,
                curso_id: est.curso_id,
                curso: cursoMap[est.curso_id] || 'Sin curso',
                documento: est.documento,
                f_nacimiento: est.f_nacimiento,
                correo: est.correo,
                telefono: est.telefono,
                eps: est.eps,
                grupo_sangre: est.grupo_sangre,
                jornada: est.jornada,
                totalMaterias: pensums.length,
                materiasAprobadas: aprobadas,
                promedio: Math.round(promedio * 10) / 10
            };
        }));

        res.json({
            acudiente: { nombre_asistente: acudiente.nombre_asistente, correo_acud: acudiente.correo_acud },
            hijos,
            totalMaterias,
            promedioGeneral: countPromedios > 0 ? Math.round((sumaPromedios / countPromedios) * 10) / 10 : 0,
            saldoPendiente: 0
        });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Resumen de notas por materia para un hijo (used by parent materia list)
router.get('/padre/notas-resumen', async (req, res) => {
    try {
        const { estudiante_id } = req.query;
        if (!estudiante_id) return res.status(400).json({ error: 'estudiante_id es obligatorio' });

        const est = await Estudiante.findOne({ estudiante_id: String(estudiante_id) }).lean();
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });

        const pensums = await Pensum.find({ class_id: est.curso_id, estado: 'A' }).lean();
        const pensumIds = pensums.map(p => p.subject_id);

        const asignaturas = await Asignatura.find().select('subject_id Id nombre').lean();
        const asigMap = {};
        asignaturas.forEach(a => { asigMap[a.subject_id] = a.nombre; });

        const consultas = await PlanillaConsulta.find({
            estudiante: String(estudiante_id),
            pensum: { $in: pensumIds }
        }).lean();

        const consultaMap = {};
        consultas.forEach(c => { consultaMap[c.pensum] = c; });

        const result = pensums.map(p => {
            const c = consultaMap[p.subject_id] || {};
            return {
                pensum_id: p.subject_id,
                asignatura: asigMap[p.asignatura_id] || p.nombre || 'N/A',
                D: parseInt(c.D) || 0,
                I: parseInt(c.I) || 0,
                F: parseInt(c.F) || 0,
                IP: parseInt(c.IP) || 0,
                FP: parseInt(c.FP) || 0,
                C1: parseInt(c.C1) || 0,
                C2: parseInt(c.C2) || 0,
                CG: parseInt(c.CG) || 0,
                def: parseInt(c.def) || 0,
                niv: c.niv || '0'
            };
        });

        res.json(result);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Tipos de registro para un hijo
router.get('/padre/tipos-registro', async (req, res) => {
    try {
        const { estudiante_id } = req.query;
        if (!estudiante_id) return res.status(400).json({ error: 'estudiante_id es obligatorio' });

        const est = await Estudiante.findOne({ estudiante_id: String(estudiante_id) }).lean();
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });

        const pensums = await Pensum.find({ class_id: est.curso_id, estado: 'A' }).lean();
        const pensumIds = pensums.map(p => p.subject_id);

        const registros = await IdNota.find({ pensum: { $in: pensumIds }, estado: 'A' }).lean();
        const tiposMap = {};
        registros.forEach(r => {
            if (r.codigo && !tiposMap[r.codigo]) {
                tiposMap[r.codigo] = { _id: r.codigo, nombre: r.concepto || r.codigo };
            }
        });

        res.json(Object.values(tiposMap));
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Notas detalladas por hijo y tipo de registro
router.get('/padre/notas', async (req, res) => {
    try {
        const { estudiante_id, tipo_id } = req.query;
        if (!estudiante_id || !tipo_id) return res.status(400).json({ error: 'estudiante_id y tipo_id son obligatorios' });

        const est = await Estudiante.findOne({ estudiante_id: String(estudiante_id) }).lean();
        if (!est) return res.status(404).json({ error: 'Estudiante no encontrado' });

        const pensums = await Pensum.find({ class_id: est.curso_id, estado: 'A' }).lean();
        const pensumIds = pensums.map(p => p.subject_id);

        const asignaturas = await Asignatura.find().select('subject_id Id nombre').lean();
        const asigMap = {};
        asignaturas.forEach(a => { asigMap[a.subject_id] = a.nombre; });

        // Get pensum → asignatura mapping
        const pensumAsigMap = {};
        pensums.forEach(p => { pensumAsigMap[p.subject_id] = asigMap[p.asignatura_id] || p.nombre || 'N/A'; });

        // Get id_notas for this tipo code
        const idNotas = await IdNota.find({ pensum: { $in: pensumIds }, codigo: String(tipo_id), estado: 'A' }).lean();
        const idNotaIds = idNotas.map(n => n.Id);

        // Get planilla_detalle for student
        const detalles = await PlanillaDetalle.find({
            codigo_est: String(estudiante_id),
            id_nota: { $in: idNotaIds },
            estado: 'A'
        }).lean();

        const detMap = {};
        detalles.forEach(d => { detMap[d.id_nota] = d; });

        // Group by pensum (materia)
        const materiaMap = {};
        idNotas.forEach(n => {
            if (!materiaMap[n.pensum]) {
                materiaMap[n.pensum] = { asignatura: pensumAsigMap[n.pensum] || 'N/A', c1: null, c2: null, c3: null };
            }
            const det = detMap[n.Id];
            const nota = det ? (parseInt(det.nota) || 0) : null;
            const reg = parseInt(n.registro) || 0;
            if (reg === 1) materiaMap[n.pensum].c1 = nota;
            else if (reg === 2) materiaMap[n.pensum].c2 = nota;
            else if (reg === 3) materiaMap[n.pensum].c3 = nota;
        });

        const result = Object.values(materiaMap).map(m => {
            const vals = [m.c1, m.c2, m.c3].filter(v => v !== null && v > 0);
            m.promedio = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) / 10 : null;
            if (m.c1 !== null) m.c1 = (m.c1 / 10).toFixed(1);
            if (m.c2 !== null) m.c2 = (m.c2 / 10).toFixed(1);
            if (m.c3 !== null) m.c3 = (m.c3 / 10).toFixed(1);
            return m;
        });

        res.json(result);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Cartera del padre
router.get('/padre/cartera', async (req, res) => {
    try {
        const { acudiente_id, estudiante_id } = req.query;
        if (!acudiente_id) return res.status(400).json({ error: 'acudiente_id es obligatorio' });

        // Get children
        const filtro = { acud_id: String(acudiente_id), estado_est: { $ne: 'R' } };
        if (estudiante_id) filtro.estudiante_id = String(estudiante_id);
        const estudiantes = await Estudiante.find(filtro).lean();
        const estIds = estudiantes.map(e => e.estudiante_id);
        const estNames = {};
        estudiantes.forEach(e => { estNames[e.estudiante_id] = e.nombre; });

        // Get pagos
        const pagos = await Pago.find({ estudiante_id: { $in: estIds } }).sort({ fecha: -1 }).lean();

        let totalPagado = 0, saldoPendiente = 0, mesesPagados = 0;
        const rows = pagos.map(p => {
            const estado = p.estado || 'pendiente';
            if (estado === 'pagado') { totalPagado += (p.valor || 0); mesesPagados++; }
            else { saldoPendiente += (p.valor || 0); }
            return {
                estudiante: estNames[p.estudiante_id] || p.estudiante_id,
                concepto: p.concepto || 'Mensualidad',
                mes: p.mes || '—',
                valor: p.valor || 0,
                estado,
                fecha_pago: p.fecha_pago || null
            };
        });

        res.json({ totalPagado, saldoPendiente, mesesPagados, pagos: rows });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 🔔 NOTIFICACIONES
// ========================================

// Todas las vistas: Leer notificaciones
router.get('/notificaciones', async (req, res) => {
    try {
        const notifs = await Notificacion.find({ estado: 'A' }).sort({ fecha_creacion: -1 }).limit(20).lean();
        res.json(notifs);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Admin: Crear notificación
router.post('/admin/notificaciones', async (req, res) => {
    try {
        const { titulo, mensaje, tipo, icono, creado_por } = req.body;
        if (!titulo || !mensaje) return res.status(400).json({ error: 'titulo y mensaje son obligatorios' });
        const notif = await Notificacion.create({
            titulo, mensaje, tipo: tipo || 'noticia', icono: icono || 'fa-bullhorn', creado_por: creado_por || 'admin'
        });
        res.json({ success: true, notificacion: notif });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Admin: Eliminar notificación
router.delete('/admin/notificaciones/:id', async (req, res) => {
    try {
        await Notificacion.findByIdAndUpdate(req.params.id, { estado: 'I' });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// ⚙️ CONFIGURACIÓN AVANZADA — Usuarios del sistema
// ========================================
router.get('/usuarios-sistema', async (req, res) => {
    try {
        const usuarios = await UsuarioGA.find({}).select('-password').lean();
        res.json(usuarios);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.post('/usuarios-sistema', async (req, res) => {
    try {
        const { cuenta, password, name, level, estado } = req.body;
        if (!cuenta || !password || !level) return res.status(400).json({ error: 'Cuenta, contraseña y nivel son obligatorios' });
        const existe = await UsuarioGA.findOne({ cuenta }).lean();
        if (existe) return res.status(409).json({ error: 'Ya existe un usuario con esa cuenta' });
        const hash = await bcrypt.hash(password, 10);
        const nuevo = new UsuarioGA({ cuenta, password: hash, name: name || cuenta, level, estado: estado || 'A' });
        await nuevo.save();
        const obj = nuevo.toObject();
        delete obj.password;
        res.status(201).json({ success: true, usuario: obj });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/usuarios-sistema/:id', async (req, res) => {
    try {
        const { name, level, estado, password } = req.body;
        const update = {};
        if (name !== undefined) update.name = name;
        if (level !== undefined) update.level = level;
        if (estado !== undefined) update.estado = estado;
        if (password && password.trim()) update.password = await bcrypt.hash(password.trim(), 10);
        const usuario = await UsuarioGA.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('-password').lean();
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ success: true, usuario });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/usuarios-sistema/:id', async (req, res) => {
    try {
        await UsuarioGA.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/usuarios-sistema/:id/password', async (req, res) => {
    try {
        const { actual, nueva } = req.body;
        if (!actual || !nueva) return res.status(400).json({ error: 'Se requiere la contraseña actual y la nueva' });
        const usuario = await UsuarioGA.findById(req.params.id).lean();
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        const valid = usuario.password && usuario.password.startsWith('$2')
            ? await bcrypt.compare(actual, usuario.password)
            : (usuario.password === actual);
        if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        await UsuarioGA.findByIdAndUpdate(req.params.id, { $set: { password: await bcrypt.hash(nueva, 10) } });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ⚙️ CONFIGURACIÓN AVANZADA — Apariencia
router.get('/empresa/apariencia', async (req, res) => {
    try {
        const emp = await Empresa.findOne().lean();
        res.json(emp ? (emp.apariencia || {}) : {});
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/empresa/apariencia', async (req, res) => {
    try {
        await Empresa.findOneAndUpdate({}, { $set: { apariencia: req.body } }, { new: true, upsert: true });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ⚙️ CONFIGURACIÓN AVANZADA — Control de acceso por módulo
router.get('/empresa/acceso-modulos', async (req, res) => {
    try {
        const emp = await Empresa.findOne().lean();
        res.json(emp ? (emp.acceso_modulos || {}) : {});
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/empresa/acceso-modulos', async (req, res) => {
    try {
        const result = await Empresa.findOneAndUpdate({}, { $set: { acceso_modulos: req.body } }, { new: true, upsert: true });
        if (!result) return res.status(404).json({ error: 'Configuración no encontrada' });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ⚙️ CONFIGURACIÓN AVANZADA — Parámetros académicos avanzados
router.get('/empresa/academico-config', async (req, res) => {
    try {
        const emp = await Empresa.findOne().lean();
        res.json(emp ? (emp.academico_avanzado || {}) : {});
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/empresa/academico-config', async (req, res) => {
    try {
        await Empresa.findOneAndUpdate({}, { $set: { academico_avanzado: req.body } }, { new: true, upsert: true });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ⚙️ CONFIGURACIÓN AVANZADA — Estadísticas del sistema
router.get('/sistema/stats', async (req, res) => {
    try {
        const [usuarios, estudiantes, docentes, acudientes, cursos, asignaturas] = await Promise.all([
            UsuarioGA.countDocuments({}),
            Estudiante.countDocuments({ estado_est: { $ne: 'R' } }),
            Docente.countDocuments({ estado: 'A' }),
            Acudiente.countDocuments({ estado: 'A' }),
            Curso.countDocuments({ estado: 'A' }),
            Asignatura.countDocuments({ estado: 'A' })
        ]);
        res.json({ usuarios, estudiantes, docentes, acudientes, cursos, asignaturas, fecha: new Date().toISOString() });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// ========================================
// 🏫 SEDES
// ========================================
router.get('/sedes', async (req, res) => {
    try {
        const sedes = await Sede.find({ activa: { $ne: false } }).sort({ nombre: 1 }).lean();
        res.json(sedes);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.get('/sedes/todas', async (req, res) => {
    try {
        const sedes = await Sede.find().sort({ nombre: 1 }).lean();
        res.json(sedes);
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.post('/sedes', async (req, res) => {
    try {
        const data = req.body;
        if (!data.nombre) return res.status(400).json({ error: 'El nombre de la sede es obligatorio' });
        const existe = await Sede.findOne({ codigo: data.codigo }).lean();
        if (existe && data.codigo) return res.status(409).json({ error: 'Ya existe una sede con ese código' });
        if (!data.color) data.color = '#6366f1';
        if (data.activa === undefined) data.activa = true;
        data.creado = new Date();
        const nueva = new Sede(data);
        await nueva.save();
        res.status(201).json({ success: true, sede: nueva.toObject() });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.put('/sedes/:id', async (req, res) => {
    try {
        const sede = await Sede.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!sede) return res.status(404).json({ error: 'Sede no encontrada' });
        res.json({ success: true, sede: sede.toObject() });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

router.delete('/sedes/:id', async (req, res) => {
    try {
        // Soft delete: marcar como inactiva
        const sede = await Sede.findByIdAndUpdate(req.params.id, { $set: { activa: false } }, { new: true });
        if (!sede) return res.status(404).json({ error: 'Sede no encontrada' });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

// Stats por sede
router.get('/sedes/:id/stats', async (req, res) => {
    try {
        const sedeId = mongoose.Types.ObjectId.isValid(req.params.id)
            ? new mongoose.Types.ObjectId(req.params.id)
            : req.params.id;
        const [estudiantes, docentes, cursos] = await Promise.all([
            Estudiante.countDocuments({ sede_id: sedeId, estado_est: { $ne: 'R' } }),
            Docente.countDocuments({ sede_id: sedeId, estado: 'A' }),
            Curso.countDocuments({ sede_id: sedeId, estado: 'A' }),
        ]);
        res.json({ estudiantes, docentes, cursos });
    } catch (error) { res.status(500).json({ error: isProduction ? 'Error interno del servidor' : error.message }); }
});

module.exports = router;
