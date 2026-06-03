const datosService       = require('../services/datos.service');
const indicadoresService = require('../services/indicadores.service');
const claudeService      = require('../services/claude.service');
const cache              = require('../cache/cache.service');

const listarHijos = async (req, res) => {
  if (req.usuario.rol !== 'padre') {
    return res.status(403).json({ error: 'Solo para acudientes' });
  }
  try {
    const acudienteId = req.usuario.acudiente_id || req.usuario.id;
    const hijos = await datosService.getHijosDeAcudiente(acudienteId);
    res.json({ hijos });
  } catch (err) {
    console.error('listarHijos:', err.message);
    res.status(500).json({ error: 'Error al listar hijos' });
  }
};

const planHijo = async (req, res) => {
  if (req.usuario.rol !== 'padre') {
    return res.status(403).json({ error: 'Solo para acudientes' });
  }
  const { estudianteId } = req.params;
  const acudienteId = req.usuario.acudiente_id || req.usuario.id;

  // Verificar que el estudiante es hijo de este acudiente
  try {
    const hijos = await datosService.getHijosDeAcudiente(acudienteId);
    const esHijo = hijos.some(h => String(h.estudiante_id) === String(estudianteId));
    if (!esHijo) return res.status(403).json({ error: 'No tiene acceso a este estudiante' });
  } catch (err) {
    return res.status(500).json({ error: 'Error al verificar acceso' });
  }

  const cacheKey = `plan_${estudianteId}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, vistaParaPadre: true, fromCache: true });

  try {
    const { estudiante, notas, asistencia, comportamiento } =
      await datosService.getDatosEstudiante(estudianteId);

    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const indicadores = indicadoresService.calcularIndicadores({ notas, asistencia, comportamiento });

    let plan = null;
    if (notas.length >= 1) {
      plan = await claudeService.generarPlanEstudiante({
        indicadores,
        curso: estudiante.nombreCurso || estudiante.curso_id || '',
        contextoExtra: 'Este plan será leído por el padre/acudiente. Incluye orientaciones sobre cómo apoyar desde el hogar.'
      });
    }

    const respuesta = {
      estudiante: { nombre: estudiante.nombre || '', curso: estudiante.nombreCurso || '' },
      indicadores,
      plan,
      generadoEn: new Date().toISOString()
    };
    cache.set(cacheKey, respuesta);
    res.json({ ...respuesta, vistaParaPadre: true });
  } catch (err) {
    console.error('planHijo:', err.message);
    res.status(500).json({ error: 'Error al obtener plan del estudiante' });
  }
};

module.exports = { listarHijos, planHijo };
