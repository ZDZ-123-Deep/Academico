const datosService       = require('../services/datos.service');
const indicadoresService = require('../services/indicadores.service');
const claudeService      = require('../services/claude.service');
const cache              = require('../cache/cache.service');

const ROLES_DOCENTE = ['profesor', 'admin', 'rector', 'coordinador'];

const dashboard = async (req, res) => {
  if (!ROLES_DOCENTE.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  try {
    const { teacher_id } = req.usuario;
    res.json({
      teacher_id: teacher_id || null,
      mensaje: 'Usa /api/ia/docente/curso/:cursoId para analizar un curso específico'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en dashboard docente' });
  }
};

const analisisCurso = async (req, res) => {
  if (!ROLES_DOCENTE.includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  const { cursoId } = req.params;
  const cacheKey = `curso_${cursoId}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fromCache: true });

  try {
    const datos = await datosService.getDatosCurso(cursoId);
    const indicadores = indicadoresService.calcularIndicadoresCurso(datos);

    const analisisIA = await claudeService.generarAnalisisCurso({
      indicadores,
      nombreCurso: datos.nombreCurso || cursoId,
      docenteNombre: req.usuario.name || req.usuario.name || 'Docente'
    });

    const respuesta = {
      curso: { curso_id: cursoId, nombre: datos.nombreCurso },
      indicadores,
      analisisIA,
      generadoEn: new Date().toISOString()
    };
    cache.set(cacheKey, respuesta);
    res.json(respuesta);
  } catch (err) {
    console.error('analisisCurso:', err.message);
    res.status(500).json({ error: 'Error al analizar curso' });
  }
};

module.exports = { dashboard, analisisCurso };
