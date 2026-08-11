/**
 * Integración con Claude API para análisis pedagógico.
 * Solo recibe indicadores procesados — nunca datos personales (PII).
 * Fallback local automático si la API no está disponible.
 * Escala del sistema: 0-100. Umbral de aprobación: 70.
 */

const Anthropic = require('@anthropic-ai/sdk');

let cliente = null;
const getCliente = () => {
  if (!cliente && process.env.ANTHROPIC_API_KEY) {
    cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cliente;
};

// Extrae el primer JSON válido de un texto (maneja markdown code blocks)
const extraerJSON = (texto) => {
  // Intentar primero dentro de un bloque ```json ... ```
  const bloqueMatch = texto.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (bloqueMatch) {
    try { return JSON.parse(bloqueMatch[1]); } catch {}
  }
  // Luego buscar el JSON más grande en el texto
  const match = texto.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
};

// Asegura que planSemanal siempre tenga arrays de acciones válidos
const normalizarPlan = (plan) => {
  if (!plan) return plan;
  if (Array.isArray(plan.planSemanal)) {
    plan.planSemanal = plan.planSemanal.map(s => ({
      ...s,
      acciones: Array.isArray(s.acciones) ? s.acciones.filter(a => typeof a === 'string' && a.trim()) : []
    }));
  }
  if (Array.isArray(plan.recomendacionesPorMateria)) {
    plan.recomendacionesPorMateria = plan.recomendacionesPorMateria.map(m => ({
      ...m,
      recursos: Array.isArray(m.recursos) ? m.recursos : []
    }));
  }
  return plan;
};

// ── Plan individual (admin, estudiante, padre) ─────────────────────────────
const generarPlanEstudiante = async ({ indicadores, curso = '', contextoExtra = '' }) => {
  const sdk = getCliente();
  if (!sdk) return planFallback(indicadores);

  const {
    promedioGeneral, tendencia, porcentajeAsistencia,
    materiasDebiles, materiasFortaleza, scoreComportamiento, nivelRiesgo
  } = indicadores;

  const materiasDebilesStr = materiasDebiles.length > 0
    ? materiasDebiles.map(m => `${m.nombre} (${m.nota}/100)`).join(', ')
    : 'ninguna';
  const materiasFortalezaStr = materiasFortaleza.length > 0
    ? materiasFortaleza.map(m => `${m.nombre} (${m.nota}/100)`).join(', ')
    : 'ninguna';

  const prompt = `Eres un asesor pedagógico experto en educación colombiana (escala 0-100, aprobación ≥70).
Genera un plan de mejora académica completo y personalizado.

DATOS ACADÉMICOS (${curso}):
- Promedio general: ${promedioGeneral}/100 | Tendencia: ${tendencia}
- Asistencia: ${porcentajeAsistencia}%
- Nivel de riesgo: ${nivelRiesgo}
- Materias con dificultad (<70): ${materiasDebilesStr}
- Materias fortaleza (≥85): ${materiasFortalezaStr}
- Score convivencia: ${scoreComportamiento}/100
${contextoExtra ? `\nCONTEXTO: ${contextoExtra}` : ''}

Responde ÚNICAMENTE con el siguiente JSON válido, sin texto antes ni después, sin backticks, sin comentarios:
{
  "diagnostico": "2-3 oraciones explicando la situación académica actual con tono constructivo",
  "prioridad": "alta|media|baja",
  "planSemanal": [
    { "semana": 1, "enfoque": "Diagnóstico", "acciones": ["Identificar las 3 materias más críticas", "Revisar las últimas evaluaciones con el docente", "Crear un horario de estudio semanal"] },
    { "semana": 2, "enfoque": "Refuerzo", "acciones": ["Dedicar 30 min diarios a la materia más débil", "Solicitar explicación adicional al docente de los temas no comprendidos", "Completar todas las tareas pendientes"] },
    { "semana": 3, "enfoque": "Práctica", "acciones": ["Resolver ejercicios de práctica de los temas vistos", "Formar un grupo de estudio con compañeros", "Crear resúmenes y mapas conceptuales"] },
    { "semana": 4, "enfoque": "Evaluación", "acciones": ["Autoevaluar el progreso en cada materia", "Prepararse para las próximas evaluaciones", "Ajustar el plan de estudio según los resultados"] }
  ],
  "recomendacionesPorMateria": [
    { "materia": "nombre de la materia", "nota": 0, "estrategia": "estrategia específica para mejorar esta materia", "recursos": ["recurso 1", "recurso 2"] }
  ],
  "recomendacionesAsistencia": "texto si asistencia <85%, null si no aplica",
  "fortalezasAprovechar": ["fortaleza 1", "fortaleza 2"],
  "metaAl30Dias": "meta concreta y medible para 30 días",
  "alertaParaPadres": "orientación para el acudiente si riesgo alto o medio, null si bajo"
}`;

  try {
    const resp = await sdk.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }]
    });
    const texto = resp.content[0].text.trim();
    const parsed = extraerJSON(texto);
    if (parsed && parsed.planSemanal) return normalizarPlan(parsed);
    console.warn('Claude: JSON inválido o sin planSemanal, usando fallback');
    return planFallback(indicadores);
  } catch (err) {
    console.error('Claude generarPlanEstudiante:', err.message);
    return planFallback(indicadores);
  }
};

// ── Análisis de curso (docente) ────────────────────────────────────────────
const generarAnalisisCurso = async ({ indicadores, nombreCurso, docenteNombre }) => {
  const sdk = getCliente();
  if (!sdk) return null;

  const { promedioCurso, totalEstudiantes, enRiesgoAlto, enRiesgoMedio, enNivelEsperado } = indicadores;

  const prompt = `Eres un asesor pedagógico. Genera recomendaciones grupales para el docente.

CURSO: ${nombreCurso} — Prof. ${docenteNombre || 'Docente'}
- Promedio del curso: ${promedioCurso ?? 'sin datos'}/100
- En riesgo alto (<60 puntos o <75% asistencia): ${enRiesgoAlto} estudiantes
- En riesgo medio (60-70 puntos): ${enRiesgoMedio} estudiantes
- En nivel esperado (≥70): ${enNivelEsperado} estudiantes
- Total: ${totalEstudiantes} estudiantes

Responde ÚNICAMENTE con el siguiente JSON válido, sin texto antes ni después:
{
  "diagnosticoGrupal": "análisis del estado del curso en 2-3 oraciones",
  "recomendacionesDiversificacion": ["estrategia pedagógica 1", "estrategia pedagógica 2", "estrategia pedagógica 3"],
  "estrategiasParaRiesgoAlto": ["estrategia 1 para los estudiantes en riesgo", "estrategia 2"],
  "alertasCriticas": ["alerta si hay situación crítica en el grupo"],
  "logrosGrupales": ["aspecto positivo del grupo"],
  "accionesInmediatas": [
    { "accion": "descripción de la acción", "urgencia": "inmediata|esta-semana|este-mes", "responsable": "docente|coordinador|psicoorientador" }
  ]
}`;

  try {
    const resp = await sdk.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    });
    const texto = resp.content[0].text.trim();
    const parsed = extraerJSON(texto);
    if (parsed) return parsed;
    return null;
  } catch (err) {
    console.error('Claude generarAnalisisCurso:', err.message);
    return null;
  }
};

// ── Fallback sin IA ────────────────────────────────────────────────────────
const planFallback = ({ promedioGeneral, porcentajeAsistencia, materiasDebiles, tendencia, nivelRiesgo }) => {
  const semana2Acciones = materiasDebiles.length > 0
    ? [
        `Dedicar 30 min diarios a ${materiasDebiles[0].nombre || 'la materia más débil'} (nota actual: ${materiasDebiles[0].nota}/100)`,
        'Completar todas las tareas y actividades pendientes',
        'Asistir a todas las clases sin excepción'
      ]
    : [
        'Mantener el ritmo de estudio actual',
        'Participar activamente en clase',
        'Revisar los apuntes de cada clase ese mismo día'
      ];

  const diagnostico = promedioGeneral !== null
    ? `Promedio general: ${promedioGeneral}/100 | Asistencia: ${porcentajeAsistencia}% | Tendencia: ${tendencia}. ${nivelRiesgo === 'alto' ? 'Se requiere atención inmediata para mejorar el rendimiento.' : nivelRiesgo === 'medio' ? 'El rendimiento requiere seguimiento y mejora constante.' : 'El rendimiento es satisfactorio, se recomienda mantener la constancia.'}`
    : 'No hay suficientes calificaciones registradas para hacer un diagnóstico completo. Se recomienda verificar el registro de notas con los docentes.';

  return {
    diagnostico,
    prioridad: nivelRiesgo === 'alto' ? 'alta' : nivelRiesgo === 'medio' ? 'media' : 'baja',
    planSemanal: [
      {
        semana: 1,
        enfoque: 'Diagnóstico',
        acciones: [
          'Identificar las materias con mayor dificultad y priorizarlas',
          'Revisar las últimas evaluaciones para identificar los temas flojos',
          'Hablar con los docentes de las materias débiles para orientación'
        ]
      },
      {
        semana: 2,
        enfoque: 'Refuerzo',
        acciones: semana2Acciones
      },
      {
        semana: 3,
        enfoque: 'Práctica',
        acciones: [
          'Resolver ejercicios adicionales de los temas evaluados',
          'Solicitar retroalimentación de los docentes sobre los avances',
          'Crear resúmenes y mapas conceptuales de cada tema'
        ]
      },
      {
        semana: 4,
        enfoque: 'Evaluación',
        acciones: [
          'Autoevaluar el progreso comparando con las notas anteriores',
          'Prepararse con anticipación para las próximas evaluaciones',
          'Ajustar el plan de estudio según los resultados obtenidos'
        ]
      }
    ],
    recomendacionesPorMateria: materiasDebiles.map(m => ({
      materia: m.nombre || 'Materia',
      nota: m.nota,
      estrategia: 'Revisar los conceptos fundamentales del área y practicar con ejercicios graduales.',
      recursos: ['Material del docente', 'Grupos de estudio', 'Khan Academy en español']
    })),
    recomendacionesAsistencia: porcentajeAsistencia < 85
      ? `Asistencia actual: ${porcentajeAsistencia}%. La asistencia regular es fundamental — cada clase perdida representa contenido no visto.`
      : null,
    fortalezasAprovechar: [],
    metaAl30Dias: promedioGeneral !== null
      ? `Alcanzar un promedio de ${Math.min(100, promedioGeneral + 8)}/100 en las próximas evaluaciones.`
      : 'Regularizar el registro de calificaciones y establecer metas de rendimiento claras.',
    alertaParaPadres: nivelRiesgo !== 'bajo'
      ? 'Se recomienda reunión con el acudiente para diseñar una estrategia conjunta de apoyo académico desde el hogar.'
      : null
  };
};

module.exports = { generarPlanEstudiante, generarAnalisisCurso };
