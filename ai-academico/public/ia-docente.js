(function () {
  'use strict';

  const API = window.AI_SERVICE_URL || 'http://localhost:3001';
  const getToken = () => sessionStorage.getItem('eduGestionToken') || localStorage.getItem('token');

  const msgError = (txt) =>
    `<div class="mensaje error" style="display:block;margin:0"><i class="fas fa-exclamation-circle" style="margin-right:6px"></i>${txt}</div>`;

  const spinnerCard = (msg) =>
    `<div style="text-align:center;padding:60px 20px">
      <i class="fas fa-brain fa-spin" style="font-size:36px;color:var(--primary);display:block;margin-bottom:14px"></i>
      <div style="font-size:14px;font-weight:500;color:var(--gray-600)">${msg}</div>
      <div style="font-size:12px;margin-top:4px;color:var(--gray-400)">Esto puede tomar unos segundos</div>
    </div>`;

  const pct = (part, total) => total ? Math.round(part / total * 100) : 0;

  function inyectarMenu() {
    const nav = document.querySelector('nav.sidebar-nav');
    if (!nav) return;
    const sec = document.createElement('div');
    sec.className = 'nav-section';
    sec.innerHTML = `
      <div class="nav-section-title">Inteligencia Artificial</div>
      <button class="nav-item" id="btn-ia-doc" onclick="iaDocente.mostrar(this)">
        <i class="fas fa-brain"></i> Análisis IA Cursos
      </button>`;
    nav.appendChild(sec);
  }

  function inyectarPanel() {
    const contenedor = document.querySelector('.page-content');
    if (!contenedor || document.getElementById('ia-panel-docente')) return;
    const panel = document.createElement('div');
    panel.className = 'section';
    panel.id = 'ia-panel-docente';
    panel.innerHTML = `
      <div class="card-header" style="margin-bottom:20px">
        <h2 class="card-title" style="font-size:1.3rem">
          <i class="fas fa-brain"></i> Análisis IA de Cursos
        </h2>
        <span style="font-size:0.85rem;color:var(--gray-500)">Indicadores grupales y recomendaciones pedagógicas generadas con IA</span>
      </div>

      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-search"></i> Buscar curso</h3>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div style="flex:1;min-width:180px">
            <label class="form-label">ID del curso</label>
            <input type="text" id="ia-curso-input" class="form-input" placeholder="Ej: 2A, 3B, GRADO5..."
              onkeydown="if(event.key==='Enter')iaDocente.analizar()">
          </div>
          <button class="btn btn-primary" onclick="iaDocente.analizar()" style="align-self:flex-end">
            <i class="fas fa-search"></i> Analizar Curso
          </button>
        </div>
      </div>

      <div id="ia-doc-resultado"></div>`;
    contenedor.appendChild(panel);
  }

  window.iaDocente = {
    mostrar(btn) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('ia-panel-docente').classList.add('active');
      if (btn) btn.classList.add('active');
    },

    async analizar() {
      const cursoId = (document.getElementById('ia-curso-input')?.value || '').trim();
      if (!cursoId) { alert('Ingresa el ID del curso'); return; }

      const el = document.getElementById('ia-doc-resultado');
      el.innerHTML = `<div class="card">${spinnerCard('Analizando el curso con IA...')}</div>`;

      try {
        const r = await fetch(`${API}/api/ia/docente/curso/${encodeURIComponent(cursoId)}`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText);
        el.innerHTML = this.renderAnalisis(data, cursoId);
      } catch (e) {
        el.innerHTML = `<div class="card">${msgError('Error: ' + e.message)}</div>`;
      }
    },

    renderAnalisis(data, cursoId) {
      const { indicadores, analisisIA } = data;
      const nombreCurso = data.curso?.nombre || cursoId;
      const total = indicadores.totalEstudiantes;
      let h = '';

      // ── Estadísticas ──────────────────────────────────────────────────────
      h += `<div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-school"></i> ${nombreCurso}</h3>
          ${indicadores.promedioCurso !== null ? `<span class="badge badge-violet">Promedio: ${indicadores.promedioCurso}/100</span>` : ''}
        </div>
        <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:0">
          <div class="stat-card">
            <div class="stat-header"><div class="stat-icon violet"><i class="fas fa-users"></i></div></div>
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total alumnos</div>
            <div class="stat-bar"><div class="stat-bar-fill violet" style="width:100%"></div></div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon" style="background:#fee2e2;color:var(--danger)"><i class="fas fa-triangle-exclamation"></i></div>
            </div>
            <div class="stat-value" style="color:${indicadores.enRiesgoAlto > 0 ? 'var(--danger)' : 'var(--success)'}">${indicadores.enRiesgoAlto}</div>
            <div class="stat-label">Riesgo alto</div>
            <div class="stat-bar"><div class="stat-bar-fill" style="background:var(--danger);width:${pct(indicadores.enRiesgoAlto, total)}%"></div></div>
          </div>
          <div class="stat-card">
            <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-minus-circle"></i></div></div>
            <div class="stat-value" style="color:${indicadores.enRiesgoMedio > 0 ? 'var(--warning)' : 'var(--success)'}">${indicadores.enRiesgoMedio}</div>
            <div class="stat-label">Riesgo medio</div>
            <div class="stat-bar"><div class="stat-bar-fill" style="background:var(--warning);width:${pct(indicadores.enRiesgoMedio, total)}%"></div></div>
          </div>
          <div class="stat-card">
            <div class="stat-header"><div class="stat-icon green"><i class="fas fa-circle-check"></i></div></div>
            <div class="stat-value" style="color:var(--success)">${indicadores.enNivelEsperado}</div>
            <div class="stat-label">En nivel</div>
            <div class="stat-bar"><div class="stat-bar-fill green" style="width:${pct(indicadores.enNivelEsperado, total)}%"></div></div>
          </div>
        </div>
      </div>`;

      if (!analisisIA) {
        h += `<div class="card"><div class="mensaje" style="display:block;background:var(--primary-light);color:var(--primary-dark)">
          <i class="fas fa-info-circle" style="margin-right:6px"></i>Análisis IA no disponible. Verifica la conexión con el servicio.
        </div></div>`;
        return h;
      }

      // ── Diagnóstico grupal ────────────────────────────────────────────────
      if (analisisIA.diagnosticoGrupal) {
        h += `<div class="card" style="border-left:4px solid var(--primary);border-radius:0 var(--radius) var(--radius) 0;margin-bottom:20px">
          <div style="font-size:0.7rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
            <i class="fas fa-brain" style="margin-right:4px"></i>Diagnóstico Grupal IA
          </div>
          <p style="margin:0;font-size:0.9rem;line-height:1.7;color:var(--gray-700)">${analisisIA.diagnosticoGrupal}</p>
        </div>`;
      }

      // ── Acciones inmediatas ────────────────────────────────────────────────
      if (analisisIA.accionesInmediatas?.length > 0) {
        h += `<div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-tasks"></i> Acciones recomendadas</h3>
          </div>
          <div class="user-list" style="margin-top:0">`;
        analisisIA.accionesInmediatas.forEach(a => {
          const urgBadge = a.urgencia === 'inmediata' ? 'badge badge-danger' :
                           a.urgencia === 'esta-semana' ? 'badge badge-warning' : 'badge badge-success';
          h += `<div class="user-item" style="flex-direction:column;align-items:flex-start;gap:8px">
            <div style="display:flex;align-items:flex-start;gap:10px;width:100%">
              <span class="${urgBadge}" style="white-space:nowrap;flex-shrink:0">${a.urgencia}</span>
              <div style="flex:1;font-size:0.9rem;color:var(--gray-700);line-height:1.5">${a.accion}</div>
            </div>
            <div style="font-size:0.75rem;color:var(--gray-400)">Responsable: <strong>${a.responsable}</strong></div>
          </div>`;
        });
        h += '</div></div>';
      }

      // ── Estrategias pedagógicas ────────────────────────────────────────────
      if (analisisIA.recomendacionesDiversificacion?.length > 0) {
        h += `<div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-lightbulb"></i> Estrategias pedagógicas</h3>
          </div>
          <div class="user-list" style="margin-top:0">
            ${analisisIA.recomendacionesDiversificacion.map(r => `
              <div class="user-item">
                <div class="user-item-info">
                  <div class="user-item-avatar" style="width:36px;height:36px;font-size:0.7rem;background:linear-gradient(135deg,var(--warning),#fcd34d)">
                    <i class="fas fa-lightbulb" style="font-size:13px;color:var(--gray-800)"></i>
                  </div>
                  <div class="user-item-details">
                    <p style="font-size:0.9rem;color:var(--gray-700);margin:0">${r}</p>
                  </div>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }

      // ── Estrategias riesgo alto ────────────────────────────────────────────
      if (analisisIA.estrategiasParaRiesgoAlto?.length > 0 && indicadores.enRiesgoAlto > 0) {
        h += `<div class="card" style="border:1px solid #fecaca;background:#fef2f2;margin-bottom:20px">
          <div class="card-header">
            <h3 class="card-title" style="color:#991b1b">
              <i class="fas fa-triangle-exclamation" style="color:var(--danger)"></i>
              Para los ${indicadores.enRiesgoAlto} estudiantes en riesgo alto
            </h3>
          </div>
          <div class="user-list" style="margin-top:0">
            ${analisisIA.estrategiasParaRiesgoAlto.map(e => `
              <div class="user-item" style="background:#fff0f0">
                <div class="user-item-info">
                  <div class="user-item-avatar" style="width:36px;height:36px;font-size:0.7rem;background:linear-gradient(135deg,var(--danger),#f87171)">
                    <i class="fas fa-exclamation" style="font-size:13px"></i>
                  </div>
                  <div class="user-item-details">
                    <p style="font-size:0.9rem;color:#7f1d1d;margin:0">${e}</p>
                  </div>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }

      // ── Logros grupales ────────────────────────────────────────────────────
      if (analisisIA.logrosGrupales?.length > 0) {
        h += `<div class="card" style="border:1px solid #86efac;background:#f0fdf4;margin-bottom:20px">
          <div class="card-header">
            <h3 class="card-title" style="color:#166534">
              <i class="fas fa-trophy" style="color:var(--success)"></i> Logros del grupo
            </h3>
          </div>
          <div class="user-list" style="margin-top:0">
            ${analisisIA.logrosGrupales.map(l => `
              <div class="user-item" style="background:#dcfce7">
                <div class="user-item-info">
                  <div class="user-item-avatar" style="width:36px;height:36px;font-size:0.7rem;background:linear-gradient(135deg,var(--success),#34d399)">
                    <i class="fas fa-star" style="font-size:13px"></i>
                  </div>
                  <div class="user-item-details">
                    <p style="font-size:0.9rem;color:#166534;margin:0">${l}</p>
                  </div>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }

      h += `<div style="font-size:0.7rem;color:var(--gray-400);text-align:right;margin-top:4px">
        ${data.fromCache ? '<i class="fas fa-bolt" style="margin-right:3px"></i>Caché · ' : ''}Generado: ${new Date(data.generadoEn).toLocaleString()}
      </div>`;
      return h;
    }
  };

  function init() {
    const u = sessionStorage.getItem('eduGestionUser');
    if (!u) return;
    try {
      const usuario = JSON.parse(u);
      if (!['profesor', 'admin', 'rector', 'coordinador'].includes(usuario.rol)) return;
    } catch { return; }
    inyectarMenu();
    inyectarPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 200);
  }
})();
