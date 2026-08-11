/**
 * Solo lectura de MongoDB. Nunca modifica datos existentes.
 * Schema real:
 *   PlanillaConsulta  → { estudiante, pensum (=Pensum.subject_id), D, I, F, def (0-100) }
 *   AsistenciaDet     → { estudiante, asiste: '1'|'0', fecha }
 *   ObservacionDocente→ { estudiante, estado: 'A', problema }
 *   Estudiante        → { estudiante_id, nombre, curso_id, acud_id }
 *   Pensum            → { subject_id, asignatura_id, nombre }
 *   Asignatura        → { subject_id, Id, nombre }
 *   Curso             → { curso_id, nombre }
 */
const Estudiante           = require('../../models/Estudiante');
const { PlanillaConsulta } = require('../../models/Planilla');
const { AsistenciaDet }    = require('../../models/Asistencia');
const { ObservacionDocente } = require('../../models/Observacion');
const Curso                = require('../../models/Curso');
const Acudiente            = require('../../models/Acudiente');
const Pensum               = require('../../models/Pensum');
const Asignatura           = require('../../models/Asignatura');

// Prioriza nota definitiva; si no, promedia los periodos disponibles
const promNota = (c) => {
  const def = parseFloat(c.def);
  if (!isNaN(def) && def > 0) return def;
  const vals = [parseFloat(c.D), parseFloat(c.I), parseFloat(c.F)]
    .filter(v => !isNaN(v) && v > 0);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
};

// Construye mapa global: pensum.subject_id → nombre legible de la asignatura
const buildPensumMap = async () => {
  const [pensums, asignaturas] = await Promise.all([
    Pensum.find().lean(),
    Asignatura.find().select('subject_id Id nombre').lean()
  ]);
  const asigMap = {};
  asignaturas.forEach(a => {
    const key = String(a.subject_id || a.Id || '');
    if (key) asigMap[key] = a.nombre;
  });
  const pensumMap = {};
  pensums.forEach(p => {
    const key = String(p.subject_id || '');
    if (key) {
      pensumMap[key] = asigMap[String(p.asignatura_id || '')] || p.nombre || null;
    }
  });
  return pensumMap;
};

// Enriquece cada nota con el nombre legible de la materia
const enriquecerNotas = (notas, pensumMap) => {
  notas.forEach(n => {
    if (!n.asignatura) {
      n.asignatura = pensumMap[String(n.pensum || '')] || null;
    }
  });
};

const getDatosEstudiante = async (estudianteId) => {
  const id = String(estudianteId);

  const [estudiante, notas, asistencia, comportamiento, pensumMap] = await Promise.all([
    Estudiante.findOne({ estudiante_id: id }).lean(),
    PlanillaConsulta.find({ estudiante: id }).lean(),
    AsistenciaDet.find({ estudiante: id }).sort({ fecha: -1 }).limit(120).lean(),
    ObservacionDocente.find({ estudiante: id, estado: 'A' }).sort({ fecha_insert: -1 }).limit(30).lean(),
    buildPensumMap()
  ]);

  enriquecerNotas(notas, pensumMap);

  if (estudiante && estudiante.curso_id) {
    const curso = await Curso.findOne({ curso_id: estudiante.curso_id }).lean();
    if (curso) estudiante.nombreCurso = curso.nombre || curso.curso_id;
  }

  return { estudiante, notas, asistencia, comportamiento };
};

const getDatosCurso = async (cursoId) => {
  const id = String(cursoId);

  const [curso, estudiantes, pensumMap] = await Promise.all([
    Curso.findOne({ curso_id: id }).lean(),
    Estudiante.find({ curso_id: id, estado_est: { $ne: 'R' } }).lean(),
    buildPensumMap()
  ]);

  const estudianteIds = estudiantes.map(e => String(e.estudiante_id));

  const [notas, asistencias] = await Promise.all([
    PlanillaConsulta.find({ estudiante: { $in: estudianteIds } }).lean(),
    AsistenciaDet.find({ estudiante: { $in: estudianteIds } }).lean()
  ]);

  enriquecerNotas(notas, pensumMap);

  // Agrupar notas por estudiante
  const notasPorEst = {};
  notas.forEach(n => {
    const eid = String(n.estudiante);
    if (!notasPorEst[eid]) notasPorEst[eid] = [];
    notasPorEst[eid].push(promNota(n));
  });

  // Agrupar asistencia por estudiante
  const asisPorEst = {};
  asistencias.forEach(a => {
    const eid = String(a.estudiante);
    if (!asisPorEst[eid]) asisPorEst[eid] = { total: 0, presentes: 0 };
    asisPorEst[eid].total++;
    if (['1', 1, true].includes(a.asiste)) asisPorEst[eid].presentes++;
  });

  const notasCurso = estudianteIds.map(eid => {
    const arr = notasPorEst[eid] || [];
    const prom = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return { estudiante_id: eid, promedio: prom };
  });

  const asistenciaCurso = estudianteIds.map(eid => {
    const a = asisPorEst[eid] || { total: 0, presentes: 0 };
    return { estudiante_id: eid, total: a.total, presentes: a.presentes };
  });

  return {
    nombreCurso: curso ? (curso.nombre || curso.curso_id) : cursoId,
    notasCurso,
    asistenciaCurso,
    estudiantesCurso: estudiantes
  };
};

const getListaEstudiantesConRiesgo = async ({ curso_id } = {}) => {
  const filtro = { estado_est: { $ne: 'R' } };
  if (curso_id) filtro.curso_id = String(curso_id);

  const [estudiantes, cursos] = await Promise.all([
    Estudiante.find(filtro).limit(300).lean(),
    Curso.find().lean()
  ]);

  const estudianteIds = estudiantes.map(e => String(e.estudiante_id));

  const [notas, asistencias] = await Promise.all([
    PlanillaConsulta.find({ estudiante: { $in: estudianteIds } }).lean(),
    AsistenciaDet.find({ estudiante: { $in: estudianteIds } }).lean()
  ]);

  const cursoMap = {};
  cursos.forEach(c => { cursoMap[c.curso_id] = c.nombre || c.curso_id; });

  const notasPorEst = {};
  notas.forEach(n => {
    const eid = String(n.estudiante);
    if (!notasPorEst[eid]) notasPorEst[eid] = [];
    const p = promNota(n);
    if (p > 0) notasPorEst[eid].push(p);
  });

  const asisPorEst = {};
  asistencias.forEach(a => {
    const eid = String(a.estudiante);
    if (!asisPorEst[eid]) asisPorEst[eid] = { total: 0, presentes: 0 };
    asisPorEst[eid].total++;
    if (['1', 1, true].includes(a.asiste)) asisPorEst[eid].presentes++;
  });

  return estudiantes.map(est => {
    const eid = String(est.estudiante_id);
    const notasArr = notasPorEst[eid] || [];
    const prom = notasArr.length > 0
      ? parseFloat((notasArr.reduce((a, b) => a + b, 0) / notasArr.length).toFixed(1))
      : null;
    const a = asisPorEst[eid] || { total: 0, presentes: 0 };
    const asis = a.total > 0 ? Math.round((a.presentes / a.total) * 100) : 100;

    let nivelRiesgo = 'ok';
    if (prom !== null && (prom < 60 || asis < 75)) nivelRiesgo = 'alto';
    else if (prom !== null && (prom < 70 || asis < 85)) nivelRiesgo = 'medio';

    return {
      estudiante_id: est.estudiante_id,
      nombre: est.nombre || '',
      curso_id: est.curso_id || '',
      nombreCurso: cursoMap[est.curso_id] || est.curso_id || '',
      promedioGeneral: prom,
      porcentajeAsistencia: asis,
      nivelRiesgo
    };
  });
};

const getHijosDeAcudiente = async (acudienteId) => {
  const hijos = await Estudiante.find({
    acud_id: String(acudienteId),
    estado_est: { $ne: 'R' }
  }).lean();
  const cursoIds = [...new Set(hijos.map(h => h.curso_id).filter(Boolean))];
  const cursos = await Curso.find({ curso_id: { $in: cursoIds } }).lean();
  const cursoMap = {};
  cursos.forEach(c => { cursoMap[c.curso_id] = c.nombre || c.curso_id; });
  return hijos.map(h => ({ ...h, nombreCurso: cursoMap[h.curso_id] || h.curso_id }));
};

module.exports = { getDatosEstudiante, getDatosCurso, getListaEstudiantesConRiesgo, getHijosDeAcudiente };
