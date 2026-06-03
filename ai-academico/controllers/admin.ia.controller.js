const datosService      = require('../services/datos.service');
const indicadoresService = require('../services/indicadores.service');
const claudeService     = require('../services/claude.service');
const cache             = require('../cache/cache.service');

const ROLES_ADMIN = ['admin', 'rector', 'coordinador'];

const listarEstudiantes = async (req, res) => {
  if (!ROLES_ADMIN.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  try {
    const { curso_id } = req.query;
    const lista = await datosService.getListaEstudiantesConRiesgo({ curso_id });
    res.json({ estudiantes: lista });
  } catch (err) {
    console.error('listarEstudiantes:', err.message);
    res.status(500).json({ error: 'Error al listar estudiantes' });
  }
};

const planEstudiante = async (req, res) => {
  if (!ROLES_ADMIN.concat(['profesor']).includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  const { id } = req.params;
  const cacheKey = `plan_${id}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fromCache: true });

  try {
    const { estudiante, notas, asistencia, comportamiento } =
      await datosService.getDatosEstudiante(id);

    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const indicadores = indicadoresService.calcularIndicadores({ notas, asistencia, comportamiento });

    let plan = null;
    if (notas.length >= 1) {
      plan = await claudeService.generarPlanEstudiante({ indicadores, curso: estudiante.curso_id || '' });
    }

    const respuesta = {
      estudiante: {
        _id: estudiante._id,
        estudiante_id: estudiante.estudiante_id,
        nombre: estudiante.nombre || '',
        curso_id: estudiante.curso_id || '',
        nombreCurso: estudiante.nombreCurso || ''
      },
      indicadores,
      plan,
      datosInsuficientes: notas.length === 0,
      generadoEn: new Date().toISOString()
    };
    cache.set(cacheKey, respuesta);
    res.json(respuesta);
  } catch (err) {
    console.error('planEstudiante:', err.message);
    res.status(500).json({ error: 'Error al generar plan' });
  }
};

const regenerarPlan = async (req, res) => {
  if (!ROLES_ADMIN.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  const { id } = req.params;
  cache.invalidate(`plan_${id}`);
  return planEstudiante(req, res);
};

module.exports = { listarEstudiantes, planEstudiante, regenerarPlan };
