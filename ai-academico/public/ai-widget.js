/**
 * Widget IA Académico — Inyección no destructiva en las vistas existentes.
 *
 * Estrategia: se añade como <script> al final del <body> sin modificar
 * ningún elemento existente. Lee sessionStorage (donde el sistema guarda el JWT)
 * y llama al microservicio IA en puerto 3001.
 *
 * Claves de sessionStorage del sistema principal:
 *   'eduGestionToken' → JWT
 *   'eduGestionUser'  → JSON con { rol, estudiante_id, nombre, ... }
 */

(function () {
  'use strict';

  const AI_URL = window.AI_SERVICE_URL || 'http://localhost:3001';

  const getToken = () => sessionStorage.getItem('eduGestionToken');
  const getUsuario = () => {
    try { return JSON.parse(sessionStorage.getItem('eduGestionUser') || 'null'); }
    catch { return null; }
  };

  const usuario = getUsuario();
  if (!usuario || !['estudiante', 'admin', 'profesor', 'padre'].includes(usuario.rol)) return;

  // ─── Estilos del widget ───────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #ia-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      background: #4f46e5; color: #fff; border: none; border-radius: 50px;
      padding: 10px 20px; font-size: 13px; font-weight: 600;
      box-shadow: 0 4px 14px rgba(79,70,229,.45); cursor: pointer;
      transition: transform .15s, box-shadow .15s; font-family: system-ui, sans-serif;
      display: flex; align-items: center; gap: 6px;
    }
    #ia-fab:hover { transform: scale(1.05); box-shadow: 0 6px 18px rgba(79,70,229,.55); }
    #ia-fab.ia-cargando { opacity: .75; cursor: wait; }

    #ia-panel {
      position: fixed; bottom: 80px; right: 24px; z-index: 9998;
      width: 340px; max-height: 520px; overflow-y: auto;
      background: #fff; border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,.14); border: 1px solid #e5e7eb;
      display: none; font-family: system-ui, sans-serif;
    }
    #ia-panel-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 18px 12px; border-bottom: 1px solid #f3f4f6; position: sticky; top: 0;
      background: #fff; border-radius: 14px 14px 0 0;
    }
    #ia-panel-header h6 { margin: 0; font-size: 14px; font-weight: 700; color: #1e1b4b; }
    #ia-cerrar {
      border: none; background: none; cursor: pointer; font-size: 20px;
      color: #9ca3af; line-height: 1; padding: 0;
    }
    #ia-cerrar:hover { color: #374151; }
    #ia-contenido { padding: 16px 18px 18px; }
    .ia-card {
      background: #f8f9ff; border-radius: 10px; padding: 12px 14px;
      margin-bottom: 12px;
    }
    .ia-badge {
      display: inline-block; font-size: 11px; font-weight: 600;
      padding: 2px 8px; border-radius: 20px; margin-bottom: 6px;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .ia-badge.alta  { background:#fee2e2; color:#b91c1c; }
    .ia-badge.media { background:#fef3c7; color:#b45309; }
    .ia-badge.baja  { background:#d1fae5; color:#065f46; }
    .ia-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .ia-kpi {
      background: #f3f4f6; border-radius: 8px; padding: 10px;
      text-align: center;
    }
    .ia-kpi-valor { font-size: 22px; font-weight: 700; }
    .ia-kpi-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .ia-rec-list { margin: 0; padding-left: 16px; }
    .ia-rec-list li { font-size: 13px; color: #374151; margin-bottom: 7px; line-height: 1.4; }
    .ia-footer { font-size: 11px; color: #d1d5db; text-align: right; margin-top: 10px; }
    .ia-spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
      border-radius: 50%; animation: ia-spin .6s linear infinite;
    }
    @keyframes ia-spin { to { transform: rotate(360deg); } }
    body.dark-mode #ia-panel,
    body[data-theme="dark"] #ia-panel { background: #1e1e2e; border-color: #2d2d3f; color: #e2e8f0; }
    body.dark-mode #ia-panel-header,
    body[data-theme="dark"] #ia-panel-header { background: #1e1e2e; border-color: #2d2d3f; }
    body.dark-mode #ia-panel-header h6,
    body[data-theme="dark"] #ia-panel-header h6 { color: #c7d2fe; }
    body.dark-mode .ia-kpi,
    body[data-theme="dark"] .ia-kpi { background: #2d2d3f; }
    body.dark-mode .ia-card,
    body[data-theme="dark"] .ia-card { background: #252536; }
    body.dark-mode .ia-kpi-label,
    body[data-theme="dark"] .ia-kpi-label { color: #9ca3af; }
    body.dark-mode .ia-rec-list li,
    body[data-theme="dark"] .ia-rec-list li { color: #d1d5db; }
  `;
  document.head.appendChild(style);

  // ─── Crear el panel y el botón flotante ───────────────────────────────────
  const boton = document.createElement('button');
  boton.id = 'ia-fab';
  boton.setAttribute('aria-label', 'Abrir análisis IA');
  boton.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><circle cx="19" cy="5" r="3" fill="currentColor" stroke="none"/></svg> Análisis IA';

  const panel = document.createElement('div');
  panel.id = 'ia-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Análisis de rendimiento académico');
  panel.innerHTML = `
    <div id="ia-panel-header">
      <h6>Análisis de Rendimiento</h6>
      <button id="ia-cerrar" aria-label="Cerrar">&times;</button>
    </div>
    <div id="ia-contenido">
      <p style="font-size:13px;color:#9ca3af;text-align:center;padding:20px 0">
        Abre el panel para ver tu análisis
      </p>
    </div>
  `;

  document.body.appendChild(boton);
  document.body.appendChild(panel);

  // ─── Eventos ──────────────────────────────────────────────────────────────
  let cargado = false;
  boton.addEventListener('click', () => {
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : 'block';
    if (!visible && !cargado) {
      cargarAnalisis();
      cargado = true;
    }
  });

  document.getElementById('ia-cerrar').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // Cerrar al hacer click fuera del panel
  document.addEventListener('click', (e) => {
    if (panel.style.display !== 'none' && !panel.contains(e.target) && e.target !== boton) {
      panel.style.display = 'none';
    }
  });

  // ─── Carga del análisis ───────────────────────────────────────────────────
  const cargarAnalisis = async () => {
    const contenido = document.getElementById('ia-contenido');
    const token = getToken();
    const usr = getUsuario();

    if (!token || !usr) {
      contenido.innerHTML = '<p style="font-size:13px;color:#9ca3af;text-align:center;padding:16px">Inicia sesión para ver tu análisis.</p>';
      return;
    }

    // Para estudiante: usar su propio estudiante_id
    // Para admin/profesor: mostrar resumen de alertas
    const esEstudiante = usr.rol === 'estudiante';
    const estudianteId = usr.estudiante_id;

    if (esEstudiante && !estudianteId) {
      contenido.innerHTML = '<p style="font-size:13px;color:#9ca3af;text-align:center;padding:16px">No se pudo identificar tu perfil de estudiante.</p>';
      return;
    }

    boton.classList.add('ia-cargando');
    boton.innerHTML = '<span class="ia-spinner"></span> Analizando…';
    contenido.innerHTML = '<p style="font-size:13px;color:#9ca3af;text-align:center;padding:24px">Generando análisis personalizado…</p>';

    try {
      let datos;
      if (usr.rol === 'padre') {
        // El acudiente no tiene estudiante_id en sesión: muestra panel informativo
        renderizarPanelPadre(contenido);
        return;
      } else if (esEstudiante) {
        const resp = await fetch(`${AI_URL}/api/ia/estudiante/${estudianteId}/analisis`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        datos = await resp.json();
        renderizarAnalisisEstudiante(datos, contenido);
      } else {
        const resp = await fetch(`${AI_URL}/api/ia/alertas`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        datos = await resp.json();
        renderizarAlertas(datos, contenido);
      }
    } catch (err) {
      cargado = false; // Permitir reintento
      contenido.innerHTML = `
        <div style="padding:16px;text-align:center">
          <p style="font-size:13px;color:#ef4444;margin-bottom:10px">No se pudo cargar el análisis.</p>
          <button id="ia-reintentar" style="font-size:12px;padding:5px 14px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;cursor:pointer">
            Reintentar
          </button>
        </div>`;
      document.getElementById('ia-reintentar')?.addEventListener('click', () => {
        cargarAnalisis();
        cargado = true;
      });
    } finally {
      boton.classList.remove('ia-cargando');
      boton.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><circle cx="19" cy="5" r="3" fill="currentColor" stroke="none"/></svg> Análisis IA';
    }
  };

  // ─── Renderizado para estudiante ──────────────────────────────────────────
  const renderizarAnalisisEstudiante = ({ indicadores, recomendaciones, datosInsuficientes }, contenedor) => {
    const { promedioGeneral, porcentajeAsistencia, tendencia, materiasDebiles } = indicadores;
    const colorAsistencia = porcentajeAsistencia >= 80 ? '#059669' : '#dc2626';
    const colorPromedio = promedioGeneral >= 70 ? '#059669' : promedioGeneral >= 60 ? '#d97706' : '#dc2626';
    const tendenciaIcono = { 'mejorando': '↑', 'declinando': '↓', 'estable': '→', 'insuficientes-datos': '–' };

    let html = `
      <div class="ia-kpis">
        <div class="ia-kpi">
          <div class="ia-kpi-valor" style="color:${colorPromedio}">${promedioGeneral}</div>
          <div class="ia-kpi-label">Promedio / 100</div>
        </div>
        <div class="ia-kpi">
          <div class="ia-kpi-valor" style="color:${colorAsistencia}">${porcentajeAsistencia}%</div>
          <div class="ia-kpi-label">Asistencia</div>
        </div>
      </div>
      <div style="text-align:center;font-size:12px;color:#6b7280;margin-bottom:12px">
        Tendencia: <strong>${tendenciaIcono[tendencia] || '–'} ${tendencia.replace('-', ' ')}</strong>
      </div>`;

    if (datosInsuficientes) {
      html += `<div class="ia-card"><p style="font-size:13px;color:#6b7280;margin:0">Se necesitan al menos 2 materias calificadas para generar recomendaciones personalizadas.</p></div>`;
    } else if (recomendaciones) {
      const prioridad = recomendaciones.prioridad || 'media';
      html += `
        <div class="ia-card">
          <span class="ia-badge ${prioridad}">Prioridad ${prioridad}</span>
          <p style="font-size:13px;color:#374151;margin:0">${recomendaciones.diagnostico}</p>
        </div>
        <div style="font-size:12px;font-weight:600;color:#4f46e5;margin-bottom:8px">Recomendaciones</div>
        <ul class="ia-rec-list">
          ${(recomendaciones.recomendaciones || []).map(r => `<li>${r}</li>`).join('')}
        </ul>`;
    }

    if (materiasDebiles.length > 0) {
      html += `
        <div style="margin-top:12px;font-size:12px;color:#6b7280">
          <strong>A reforzar:</strong> ${materiasDebiles.join(', ')}
        </div>`;
    }

    html += `<div class="ia-footer">Generado por IA · ${new Date().toLocaleDateString('es-CO')}</div>`;
    contenedor.innerHTML = html;
  };

  // ─── Panel informativo para acudientes ───────────────────────────────────
  const renderizarPanelPadre = (contenedor) => {
    contenedor.innerHTML = `
      <div class="ia-card" style="text-align:center;padding:20px 14px">
        <div style="font-size:32px;margin-bottom:10px">📊</div>
        <p style="font-size:14px;font-weight:600;color:#1e1b4b;margin-bottom:8px">Análisis de Rendimiento</p>
        <p style="font-size:13px;color:#6b7280;margin-bottom:14px;line-height:1.5">
          El análisis detallado con recomendaciones personalizadas está disponible en el
          <strong>portal del estudiante</strong>.
        </p>
        <p style="font-size:12px;color:#9ca3af;line-height:1.5">
          Para consultar el desempeño académico de su acudido, comuníquese con el director de grupo
          o revise las observaciones en este portal.
        </p>
      </div>
      <div class="ia-footer">Módulo IA Académico</div>`;
  };

  // ─── Renderizado para admin/profesor ─────────────────────────────────────
  const renderizarAlertas = ({ alertas }, contenedor) => {
    if (!alertas || alertas.length === 0) {
      contenedor.innerHTML = '<p style="font-size:13px;color:#059669;text-align:center;padding:16px">No hay estudiantes en riesgo detectados.</p>';
      return;
    }

    const criticos = alertas.filter(a => a.nivel === 'critico').length;
    const advertencias = alertas.filter(a => a.nivel === 'advertencia').length;

    let html = `
      <div class="ia-kpis">
        <div class="ia-kpi">
          <div class="ia-kpi-valor" style="color:#dc2626">${criticos}</div>
          <div class="ia-kpi-label">Críticos</div>
        </div>
        <div class="ia-kpi">
          <div class="ia-kpi-valor" style="color:#d97706">${advertencias}</div>
          <div class="ia-kpi-label">En advertencia</div>
        </div>
      </div>
      <div style="font-size:12px;font-weight:600;color:#4f46e5;margin-bottom:8px">Estudiantes en riesgo</div>`;

    alertas.slice(0, 8).forEach(a => {
      const color = a.nivel === 'critico' ? '#dc2626' : '#d97706';
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
          <span style="color:#374151;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.nombre}</span>
          <span style="color:${color};font-weight:600;margin-left:8px">${a.promedioGeneral}</span>
        </div>`;
    });

    if (alertas.length > 8) {
      html += `<p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px">y ${alertas.length - 8} más…</p>`;
    }

    html += `<div class="ia-footer">Generado por IA · ${new Date().toLocaleDateString('es-CO')}</div>`;
    contenedor.innerHTML = html;
  };

})();
