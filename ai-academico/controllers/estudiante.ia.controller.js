const datosService       = require('../services/datos.service');
const indicadoresService = require('../services/indicadores.service');
const claudeService      = require('../services/claude.service');
const cache              = require('../cache/cache.service');

const miPlan = async (req, res) => {
  if (req.usuario.rol !== 'estudiante') {
    return res.status(403).json({ error: 'Solo para estudiantes' });
  }

  // El JWT del estudiante contiene estudiante_id (asignado en login)
  const estudianteId = req.usuario.estudiante_id;
  if (!estudianteId) {
    return res.status(400).json({ error: 'estudiante_id no encontrado en el token' });
  }

  const cacheKey = `miplan_${estudianteId}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fromCache: true });

  try {
    const { estudiante, notas, asistencia, comportamiento } =
      await datosService.getDatosEstudiante(estudianteId);

    if (!estudiante) return res.status(404).json({ error: 'Perfil no encontrado' });

    const indicadores = indicadoresService.calcularIndicadores({ notas, asistencia, comportamiento });

    let plan = null;
    if (notas.length >= 1) {
      plan = await claudeService.generarPlanEstudiante({
        indicadores,
        curso: estudiante.nombreCurso || estudiante.curso_id || '',
        contextoExtra: 'Este plan será visto directamente por el estudiante. Usa un tono motivador y habla en segunda persona.'
      });
    }

    const respuesta = {
      nombre: (estudiante.nombre || '').split(' ')[0],
      curso: estudiante.nombreCurso || estudiante.curso_id,
      indicadores,
      plan,
      generadoEn: new Date().toISOString()
    };
    cache.set(cacheKey, respuesta);
    res.json(respuesta);
  } catch (err) {
    console.error('miPlan:', err.message);
    res.status(500).json({ error: 'Error al cargar tu plan' });
  }
};

module.exports = { miPlan };
