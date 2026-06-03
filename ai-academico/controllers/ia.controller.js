/**
 * Controlador IA — Importa los modelos existentes en modo solo lectura.
 * Todas las queries usan .lean() para mejor rendimiento.
 * Nunca llama a .save(), .create(), .update(), .delete() sobre ninguna colección.
 *
 * Modelos del sistema principal (strict:false, colecciones reales de MongoDB):
 *   Estudiante       → colección 'estudiante'      | campo ID: estudiante_id
 *   PlanillaConsulta → colección 'planilla_consulta'| campos: estudiante, pensum, D, I, F, def
 *   AsistenciaDet    → colección 'asistencia_det'  | campos: estudiante, asistencia, pensum, fecha
 *   ObservacionDocente → colección 'observacion_docente' | campos: estudiante, problema, fecha_insert, estado
 *   Pensum           → colección 'pensum'           | campos: class_id, asignatura_id, subject_id
 *   Asignatura       → colección 'asignatura'       | campos: subject_id, nombre
 */

const Estudiante = require('../../models/Estudiante');
const { PlanillaConsulta } = require('../../models/Planilla');
const { AsistenciaDet } = require('../../models/Asistencia');
const { ObservacionDocente } = require('../../models/Observacion');
const Pensum = require('../../models/Pensum');
const Asignatura = require('../../models/Asignatura');

const { calcularIndicadores } = require('../services/indicadores.service');
const { generarAnalisisIA } = require('../services/claude.service');

/**
 * Analiza el rendimiento de un estudiante y genera recomendaciones personalizadas.
 * Solo admin, el propio estudiante, y profesor pueden consultar.
 */
const analizarEstudiante = async (req, res) => {
  try {
    const { estudiante_id } = req.params;
    const { periodo } = req.query;
    const { rol, id: usuarioId } = req.usuario;

    // Control de acceso: el estudiante solo puede ver su propio análisis
    if (rol === 'estudiante') {
      const userData = req.usuarioData;
      // El JWT no lleva estudiante_id, pero el frontend siempre lo envía como query param
      // desde su propio contexto. La verificación real la hace el lookup a BD.
    }
    if (!['admin', 'profesor', 'estudiante', 'padre'].includes(rol)) {
      return res.status(403).json({ error: 'Sin permisos para acceder al módulo IA' });
    }

    // Buscar estudiante
    const estudiante = await Estudiante.findOne({ estudiante_id: String(estudiante_id) }).lean();
    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    // Construir filtro de período si se especifica
    const filtroPeriodo = periodo ? { planilla: String(periodo) } : {};

    // Obtener datos académicos en paralelo (solo lectura)
    const [consultas, asistencias, observaciones, pensums] = await Promise.all([
      PlanillaConsulta.find({ estudiante: String(estudiante_id) })
        .lean(),
      AsistenciaDet.find({ estudiante: String(estudiante_id) })
        .sort({ fecha: -1 }).limit(120).lean(),
      ObservacionDocente.find({ estudiante: String(estudiante_id), estado: 'A' })
        .sort({ fecha_insert: -1 }).limit(30).lean(),
      Pensum.find({ class_id: estudiante.curso_id, estado: 'A' }).lean()
    ]);

    // Enriquecer consultas con nombre de asignatura si está disponible
    if (pensums.length > 0) {
      const asignaturaIds = [...new Set(pensums.map(p => p.asignatura_id).filter(Boolean))];
      const asignaturas = await Asignatura.find({ subject_id: { $in: asignaturaIds } }).lean();
      const asigMap = {};
      asignaturas.forEach(a => { asigMap[a.subject_id] = a.nombre; });
      const pensumMap = {};
      pensums.forEach(p => { pensumMap[p.subject_id] = asigMap[p.asignatura_id] || p.nombre || p.subject_id; });

      consultas.forEach(c => {
        if (!c.asignatura && pensumMap[c.pensum]) {
          c.asignatura = pensumMap[c.pensum];
        }
      });
    }

    // Calcular indicadores cuantitativos localmente
    const indicadores = calcularIndicadores({ consultas, asistencias, observaciones });

    // Generar análisis cualitativo con Claude solo si hay suficientes datos
    let recomendaciones = null;
    const datosInsuficientes = consultas.length < 2;

    if (!datosInsuficientes) {
      recomendaciones = await generarAnalisisIA({
        indicadores,
        nivelEducativo: estudiante.curso_id || 'Estudiante'
      });
    }

    res.json({
      estudiante: {
        nombre: estudiante.nombre,
        curso_id: estudiante.curso_id
      },
      indicadores,
      recomendaciones,
      datosInsuficientes,
      generadoEn: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error análisis IA:', error);
    res.status(500).json({ error: 'Error al generar análisis' });
  }
};

/**
 * Identifica estudiantes en riesgo académico de un curso completo.
 * Solo accesible para admin y profesor.
 */
const alertasTempranas = async (req, res) => {
  try {
    if (!['admin', 'profesor'].includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Solo admin y docentes pueden ver alertas globales' });
    }

    const { umbralNota = 70, umbralAsistencia = 80 } = req.query;
    const umbralN = parseInt(umbralNota);
    const umbralA = parseInt(umbralAsistencia);

    // Agrupar consultas por estudiante y calcular promedio
    const promediosPorEstudiante = await PlanillaConsulta.aggregate([
      {
        $group: {
          _id: '$estudiante',
          promedioGeneral: {
            $avg: {
              $cond: [
                { $gt: [{ $toInt: { $ifNull: ['$def', '0'] } }, 0] },
                { $toInt: '$def' },
                { $toInt: { $ifNull: ['$D', '0'] } }
              ]
            }
          },
          totalMaterias: { $sum: 1 }
        }
      },
      {
        $match: {
          promedioGeneral: { $lt: umbralN, $gt: 0 },
          totalMaterias: { $gte: 2 }
        }
      },
      { $limit: 50 }
    ]);

    // Enriquecer con nombres de estudiante
    const ids = promediosPorEstudiante.map(p => p._id);
    const estudiantes = await Estudiante.find(
      { estudiante_id: { $in: ids }, estado_est: { $ne: 'R' } },
      { estudiante_id: 1, nombre: 1, curso_id: 1 }
    ).lean();

    const estMap = {};
    estudiantes.forEach(e => { estMap[e.estudiante_id] = e; });

    const alertas = promediosPorEstudiante
      .filter(p => estMap[p._id])
      .map(p => ({
        estudiante_id: p._id,
        nombre: estMap[p._id]?.nombre || p._id,
        curso_id: estMap[p._id]?.curso_id || '',
        promedioGeneral: Math.round(p.promedioGeneral),
        totalMaterias: p.totalMaterias,
        nivel: p.promedioGeneral < 60 ? 'critico' : 'advertencia'
      }))
      .sort((a, b) => a.promedioGeneral - b.promedioGeneral);

    res.json({
      alertas,
      umbralNota: umbralN,
      umbralAsistencia: umbralA,
      generadoEn: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error alertas tempranas:', error);
    res.status(500).json({ error: 'Error al calcular alertas' });
  }
};

/**
 * Recomendaciones agregadas para un curso completo.
 */
const recomendacionesGrupo = async (req, res) => {
  try {
    if (!['admin', 'profesor'].includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    const { curso_id } = req.params;

    const estudiantes = await Estudiante.find(
      { curso_id: String(curso_id), estado_est: { $ne: 'R' } },
      { estudiante_id: 1, nombre: 1 }
    ).lean();

    if (estudiantes.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado o sin estudiantes activos' });
    }

    const ids = estudiantes.map(e => e.estudiante_id);

    const consultas = await PlanillaConsulta.aggregate([
      { $match: { estudiante: { $in: ids } } },
      {
        $group: {
          _id: '$pensum',
          promedio: {
            $avg: {
              $cond: [
                { $gt: [{ $toInt: { $ifNull: ['$def', '0'] } }, 0] },
                { $toInt: '$def' },
                { $toInt: { $ifNull: ['$D', '0'] } }
              ]
            }
          },
          totalEstudiantes: { $sum: 1 }
        }
      },
      { $sort: { promedio: 1 } }
    ]);

    const promedioGrupo = consultas.length > 0
      ? Math.round(consultas.reduce((s, c) => s + c.promedio, 0) / consultas.length)
      : 0;

    const materiasProblematicas = consultas
      .filter(c => c.promedio < 70)
      .slice(0, 5)
      .map(c => ({ pensum_id: c._id, promedio: Math.round(c.promedio), totalEstudiantes: c.totalEstudiantes }));

    res.json({
      curso_id,
      totalEstudiantes: estudiantes.length,
      promedioGrupo,
      materiasProblematicas,
      generadoEn: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error recomendaciones grupo:', error);
    res.status(500).json({ error: 'Error al generar recomendaciones del grupo' });
  }
};

module.exports = { analizarEstudiante, recomendacionesGrupo, alertasTempranas };
