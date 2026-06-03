/**
 * Calcula indicadores cuantitativos. No depende de Claude API.
 * Escala del sistema: 0-100. Umbral aprobación: ≥70.
 *
 * Parámetros:
 *   notas         → array PlanillaConsulta { D, I, F, def, pensum, asignatura }
 *   asistencia    → array AsistenciaDet { asiste: '1'|'0', fecha }
 *   comportamiento→ array ObservacionDocente { estado: 'A' }
 */

// Prioriza nota definitiva; si no, promedia periodos disponibles
const promNota = (c) => {
  const def = parseFloat(c.def);
  if (!isNaN(def) && def > 0) return def;
  const vals = [parseFloat(c.D), parseFloat(c.I), parseFloat(c.F)]
    .filter(v => !isNaN(v) && v > 0);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
};

// Mapa de valores internos de tendencia a etiquetas en español
const TENDENCIA_LABEL = {
  'mejorando':          'Mejorando',
  'declinando':         'Declinando',
  'estable':            'Estable',
  'insuficientes-datos': 'Sin datos'
};

const calcularIndicadores = ({ notas, asistencia, comportamiento }) => {
  const notasConValor = notas.filter(n => promNota(n) > 0);

  const promedioGeneral = notasConValor.length > 0
    ? Math.round(notasConValor.reduce((sum, n) => sum + promNota(n), 0) / notasConValor.length)
    : null;

  const tendenciaRaw = calcularTendencia(notas);
  const tendencia = TENDENCIA_LABEL[tendenciaRaw] || tendenciaRaw;

  const porcentajeAsistencia = asistencia.length > 0
    ? Math.round(
        asistencia.filter(a => ['1', 1, true].includes(a.asiste)).length
        / asistencia.length * 100
      )
    : 100;

  // Deduplicar por nombre de materia (puede haber varias planillas por materia)
  const materiasMap = {};
  notasConValor.forEach(n => {
    const nombre = n.asignatura || null;
    if (!nombre) return;
    const nota = Math.round(promNota(n));
    if (!materiasMap[nombre] || nota < materiasMap[nombre]) {
      materiasMap[nombre] = nota;
    }
  });

  // Si hay materias con nombres, usar esas; si no, usar todas (con ID numérico)
  let materiasOrdenadas;
  const conNombre = Object.entries(materiasMap).map(([nombre, nota]) => ({ nombre, nota }));
  if (conNombre.length > 0) {
    materiasOrdenadas = conNombre.sort((a, b) => a.nota - b.nota);
  } else {
    materiasOrdenadas = notasConValor
      .map(n => ({ nombre: String(n.pensum || 'Materia'), nota: Math.round(promNota(n)) }))
      .sort((a, b) => a.nota - b.nota);
  }

  const materiasDebiles   = materiasOrdenadas.filter(m => m.nota < 70).slice(0, 3);
  const materiasFortaleza = [...materiasOrdenadas].reverse().filter(m => m.nota >= 85).slice(0, 3);

  const scoreComportamiento = Math.max(0, 100 - (comportamiento.length * 10));

  let nivelRiesgo = 'bajo';
  if (promedioGeneral !== null && (promedioGeneral < 60 || porcentajeAsistencia < 75)) nivelRiesgo = 'alto';
  else if (promedioGeneral !== null && (promedioGeneral < 70 || porcentajeAsistencia < 85)) nivelRiesgo = 'medio';

  return {
    promedioGeneral: promedioGeneral ?? 0,
    tendencia,
    tendenciaRaw,
    porcentajeAsistencia,
    materiasDebiles,
    materiasFortaleza,
    materiasOrdenadas,
    scoreComportamiento,
    nivelRiesgo,
    totalMateriasAnalizadas: notasConValor.length,
    totalObservaciones: comportamiento.length
  };
};

const calcularTendencia = (notas) => {
  const conDos = notas.filter(n => {
    const d = parseFloat(n.D) || 0;
    const fi = parseFloat(n.F) || parseFloat(n.I) || 0;
    return d > 0 && fi > 0;
  });
  if (conDos.length < 2) return 'insuficientes-datos';
  const mejoras = conDos.filter(n =>
    (parseFloat(n.F) || parseFloat(n.I) || 0) > (parseFloat(n.D) || 0) + 5
  ).length;
  const declives = conDos.filter(n =>
    (parseFloat(n.F) || parseFloat(n.I) || 0) < (parseFloat(n.D) || 0) - 5
  ).length;
  if (mejoras > conDos.length * 0.5) return 'mejorando';
  if (declives > conDos.length * 0.5) return 'declinando';
  return 'estable';
};

const calcularIndicadoresCurso = ({ notasCurso, asistenciaCurso, estudiantesCurso }) => {
  const conNota = notasCurso.filter(n => n.promedio !== null && n.promedio > 0);
  const promedioCurso = conNota.length > 0
    ? parseFloat((conNota.reduce((s, n) => s + n.promedio, 0) / conNota.length).toFixed(1))
    : null;

  let enRiesgoAlto = 0, enRiesgoMedio = 0, enNivelEsperado = 0;
  estudiantesCurso.forEach(est => {
    const n = notasCurso.find(x => String(x.estudiante_id) === String(est.estudiante_id));
    const a = asistenciaCurso.find(x => String(x.estudiante_id) === String(est.estudiante_id));
    const prom = n?.promedio ?? null;
    const asis = a && a.total > 0 ? Math.round(a.presentes / a.total * 100) : 100;
    if (prom !== null && (prom < 60 || asis < 75)) enRiesgoAlto++;
    else if (prom !== null && (prom < 70 || asis < 85)) enRiesgoMedio++;
    else enNivelEsperado++;
  });

  return {
    promedioCurso,
    totalEstudiantes: estudiantesCurso.length,
    enRiesgoAlto,
    enRiesgoMedio,
    enNivelEsperado
  };
};

module.exports = { calcularIndicadores, calcularIndicadoresCurso };
