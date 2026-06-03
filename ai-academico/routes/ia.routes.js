const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');

const adminCtrl      = require('../controllers/admin.ia.controller');
const estudianteCtrl = require('../controllers/estudiante.ia.controller');
const docenteCtrl    = require('../controllers/docente.ia.controller');
const padreCtrl      = require('../controllers/padre.ia.controller');

// Todas las rutas IA requieren JWT válido
router.use(verificarToken);

// ── Admin ──────────────────────────────────────────────────────────────────
router.get('/admin/estudiantes',                adminCtrl.listarEstudiantes);
router.get('/admin/estudiante/:id/plan',        adminCtrl.planEstudiante);
router.post('/admin/estudiante/:id/regenerar',  adminCtrl.regenerarPlan);

// ── Estudiante ─────────────────────────────────────────────────────────────
router.get('/mi-plan', estudianteCtrl.miPlan);

// ── Docente ────────────────────────────────────────────────────────────────
router.get('/docente/dashboard',        docenteCtrl.dashboard);
router.get('/docente/curso/:cursoId',   docenteCtrl.analisisCurso);

// ── Padre/Acudiente ────────────────────────────────────────────────────────
router.get('/padre/hijos',                          padreCtrl.listarHijos);
router.get('/padre/hijo/:estudianteId/plan',        padreCtrl.planHijo);

module.exports = router;
