(function () {
  'use strict';

  const API = window.AI_SERVICE_URL || 'http://localhost:3001';
  const getToken = () => sessionStorage.getItem('eduGestionToken') || localStorage.getItem('token');

  const NIVEL_BADGE = { bajo: 'badge badge-success', medio: 'badge badge-warning', alto: 'badge badge-danger' };
  const NIVEL_COLOR = { bajo: 'var(--success)', medio: 'var(--warning)', alto: 'var(--danger)' };

  const ini = (nombre) =>
    (nombre || 'XX').split(' ').slice(0, 2).map(p => (p[0] || '')).join('').toUpperCase();

  const msgError = (txt) =>
    `<div class="mensaje error" style="display:block;margin:0"><i class="fas fa-exclamation-circle" style="margin-right:6px"></i>${txt}</div>`;

  const spinnerCard = (msg) =>
    `<div style="text-align:center;padding:60px 20px">
      <i class="fas fa-brain fa-spin" style="font-size:36px;color:var(--primary);display:block;margin-bottom:14px"></i>
      <div style="font-size:14px;font-weight:500;color:var(--gray-600)">${msg}</div>
      <div style="font-size:12px;margin-top:4px;color:var(--gray-400)">Esto puede tomar unos segundos</div>
    </div>`;

  function inyectarMenu() {
    const nav = document.querySelector('nav.sidebar-nav');
    if (!nav) return;
    const sec = document.createElement('div');
    sec.className = 'nav-section';
    sec.innerHTML = `
      <div class="nav-section-title">Inteligencia Artificial</div>
      <button class="nav-item" id="btn-ia-padre" onclick="iaPadre.mostrar(this)">
        <i class="fas fa-brain"></i> Plan IA de mi Hijo
      </button>`;
    nav.appendChild(sec);
  }

  function inyectarPanel() {
    const contenedor = document.querySelector('.page-content');
    if (!contenedor || document.getElementById('ia-panel-padre')) return;
    const panel = document.createElement('div');
    panel.className = 'section';
    panel.id = 'ia-panel-padre';
    panel.innerHTML = `
      <div class="card-header" style="margin-bottom:20px">
        <h2 class="card-title" style="font-size:1.3rem">
          <i class="fas fa-brain"></i> Plan de Mejora — Análisis IA
        </h2>
        <span style="font-size:0.85rem;color:var(--gray-500)">Rendimiento de su(s) hijo(s) con recomendaciones de apoyo desde el hogar.</span>
      </div>
      <div id="ia-padre-hijos">
        <div class="card">${spinnerCard('Cargando información...')}</div>
      </div>
      <div id="ia-padre-plan"></div>`;
    contenedor.appendChild(panel);
  }

  window.iaPadre = {
    hijos: [],
    cargado: false,

    mostrar(btn) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('ia-panel-padre').classList.add('active');
      if (btn) btn.classList.add('active');
      if (!this.cargado) this.cargarHijos();
    },

    async cargarHijos() {
      this.cargado = true;
      const el = document.getElementById('ia-padre-hijos');
      try {
        const r = await fetch(`${API}/api/ia/padre/hijos`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText);
        this.hijos = data.hijos || [];
        this.renderHijos();
      } catch (e) {
        this.cargado = false;
        el.innerHTML = `<div class="card">${msgError('Error: ' + e.message)}</div>`;
      }
    },

    renderHijos() {
      const el = document.getElementById('ia-padre-hijos');
      if (!this.hijos.length) {
        el.innerHTML = `<div class="card"><div class="mensaje" style="display:block;background:var(--primary-light);color:var(--primary-dark)">
          No se encontraron hijos registrados para su cuenta.
        </div></div>`;
        return;
      }
      el.innerHTML = `<div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-users"></i> Selecciona el estudiante</h3>
        </div>
        <div class="user-list" style="margin-top:0">
          ${this.hijos.map(hijo => `
            <div class="user-item" style="cursor:pointer" onclick="iaPadre.verPlan('${hijo.estudiante_id}')">
              <div class="user-item-info">
                <div class="user-item-avatar">${ini(hijo.nombre)}</div>
                <div class="user-item-details">
                  <h4>${hijo.nombre}</h4>
                  <p>${hijo.nombreCurso || hijo.curso_id || ''}</p>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm">
                <i class="fas fa-brain"></i> Ver Plan IA
              </button>
            </div>`).join('')}
        </div>
      </div>`;
    },

    async verPlan(estudianteId) {
      const el = document.getElementById('ia-padre-plan');
      el.innerHTML = `<div class="card">${spinnerCard('Generando plan con IA...')}</div>`;
      try {
        const r = await fetch(`${API}/api/ia/padre/hijo/${estudianteId}/plan`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText);
        el.innerHTML = this.renderPlan(data);
      } catch (e) {
        el.innerHTML = `<div class="card">${msgError('Error: ' + e.message)}</div>`;
      }
    },

    renderPlan(data) {
      const { estudiante, indicadores, plan } = data;
      if (!indicadores) return `<div class="card"><div class="mensaje" style="display:block;background:var(--primary-light);color:var(--primary-dark)">Sin datos académicos disponibles aún.</div></div>`;

      const nivel = indicadores.nivelRiesgo || 'bajo';
      const nColor = NIVEL_COLOR[nivel] || 'var(--success)';
      const promDanger = indicadores.promedioGeneral < 60;
      const promWarn   = indicadores.promedioGeneral < 70;
      const asisWarn   = indicadores.porcentajeAsistencia < 85;
      const asisDanger = indicadores.porcentajeAsistencia < 75;
      let h = '';

      // ── Cabecera estudiante ───────────────────────────────────────────────
      h += `<div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div class="user-item-avatar" style="width:56px;height:56px;font-size:1.1rem;flex-shrink:0">${ini(estudiante?.nombre || '')}</div>
          <div style="flex:1;min-width:0">
            <h3 style="margin:0 0 4px;font-size:1.15rem;font-weight:700;color:var(--gray-900)">${estudiante?.nombre || 'Estudiante'}</h3>
            <p style="margin:0;font-size:0.85rem;color:var(--gray-500)">${estudiante?.curso || ''}</p>
          </div>
          <span class="${NIVEL_BADGE[nivel] || 'badge badge-success'}" style="font-size:0.8rem;padding:6px 16px">Riesgo ${nivel}</span>
        </div>
        ${asisWarn ? `
          <div class="mensaje" style="display:flex;margin-top:16px;margin-bottom:0;background:#fef3c7;color:#92400e;align-items:center;gap:8px">
            <i class="fas fa-triangle-exclamation"></i>
            <span><strong>Asistencia crítica:</strong> ${indicadores.porcentajeAsistencia}% — requiere atención inmediata.</span>
          </div>` : ''}
      </div>`;

      // ── Métricas ──────────────────────────────────────────────────────────
      h += `<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon ${promDanger ? '' : promWarn ? 'orange' : 'green'}"
              style="${promDanger ? 'background:#fee2e2;color:var(--danger)' : ''}">
              <i class="fas fa-chart-line"></i>
            </div>
          </div>
          <div class="stat-value" style="color:${promDanger ? 'var(--danger)' : promWarn ? 'var(--warning)' : 'var(--success)'}">${indicadores.promedioGeneral}/100</div>
          <div class="stat-label">Promedio General</div>
          <div class="stat-bar">
            <div class="stat-bar-fill ${promDanger || promWarn ? '' : 'green'}"
              style="width:${indicadores.promedioGeneral}%;${promDanger ? 'background:var(--danger)' : promWarn ? 'background:var(--warning)' : ''}"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon ${asisDanger ? '' : asisWarn ? 'orange' : 'green'}"
              style="${asisDanger ? 'background:#fee2e2;color:var(--danger)' : ''}">
              <i class="fas fa-calendar-check"></i>
            </div>
          </div>
          <div class="stat-value" style="color:${asisDanger ? 'var(--danger)' : asisWarn ? 'var(--warning)' : 'var(--success)'}">${indicadores.porcentajeAsistencia}%</div>
          <div class="stat-label">Asistencia</div>
          <div class="stat-bar">
            <div class="stat-bar-fill ${asisWarn ? '' : 'green'}"
              style="width:${indicadores.porcentajeAsistencia}%;${asisDanger ? 'background:var(--danger)' : asisWarn ? 'background:var(--warning)' : ''}"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-heart"></i></div></div>
          <div class="stat-value">${indicadores.scoreComportamiento}/100</div>
          <div class="stat-label">Convivencia</div>
          <div class="stat-bar"><div class="stat-bar-fill" style="background:var(--info);width:${indicadores.scoreComportamiento}%"></div></div>
        </div>
      </div>`;

      if (!plan) {
        return h + `<div class="card"><div class="mensaje" style="display:block;background:var(--primary-light);color:var(--primary-dark)">Sin suficientes calificaciones para generar un plan IA.</div></div>`;
      }

      // ── Diagnóstico ───────────────────────────────────────────────────────
      h += `<div class="card" style="border-left:4px solid ${nColor};border-radius:0 var(--radius) var(--radius) 0;margin-bottom:20px">
        <div style="font-size:0.7rem;font-weight:700;color:${nColor};text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
          <i class="fas fa-magnifying-glass" style="margin-right:4px"></i>Diagnóstico
        </div>
        <p style="margin:0;font-size:0.9rem;line-height:1.7;color:var(--gray-700)">${plan.diagnostico}</p>
      </div>`;

      // ── Cómo apoyar desde el hogar ────────────────────────────────────────
      if (plan.alertaParaPadres) {
        h += `<div class="card" style="border:1px solid #fde68a;background:#fffbeb;margin-bottom:20px">
          <div class="card-header" style="margin-bottom:8px">
            <h3 class="card-title" style="color:#92400e">
              <i class="fas fa-house-heart" style="color:#92400e"></i> Cómo apoyar desde el hogar
            </h3>
          </div>
          <p style="margin:0;font-size:0.9rem;line-height:1.7;color:#78350f">${plan.alertaParaPadres}</p>
        </div>`;
      }

      // ── Plan semanal ──────────────────────────────────────────────────────
      if (plan.planSemanal?.length > 0) {
        const semColors = [
          { bg: 'var(--primary-light)', border: '#c4b5fd', text: 'var(--primary-dark)' },
          { bg: '#e0f2fe',              border: '#7dd3fc', text: '#0369a1'              },
          { bg: '#fef3c7',              border: '#fcd34d', text: '#92400e'              },
          { bg: '#dcfce7',              border: '#86efac', text: '#166534'              }
        ];
        h += `<div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-calendar-week"></i> Plan de mejora — 4 semanas</h3>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${plan.planSemanal.map((s, i) => {
              const col = semColors[i % 4];
              const acciones = Array.isArray(s.acciones) ? s.acciones.filter(a => a && a.trim()) : [];
              return `<div style="background:${col.bg};border:1px solid ${col.border};border-radius:var(--radius-sm);padding:16px">
                <div style="font-size:0.7rem;font-weight:700;color:${col.text};text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Semana ${s.semana} · ${(s.enfoque || '').toUpperCase()}</div>
                ${acciones.length > 0
                  ? `<ul style="margin:0;padding-left:16px">${acciones.map(a => `<li style="font-size:0.8rem;margin-bottom:5px;line-height:1.5;color:var(--gray-700)">${a}</li>`).join('')}</ul>`
                  : `<p style="font-size:0.8rem;color:var(--gray-400);margin:0;font-style:italic">Sin acciones definidas</p>`}
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }

      // ── Meta 30 días ──────────────────────────────────────────────────────
      if (plan.metaAl30Dias) {
        h += `<div class="card" style="border:1px solid #86efac;background:linear-gradient(135deg,#f0fdf4,#dcfce7);margin-bottom:16px">
          <div class="card-header" style="margin-bottom:8px">
            <h3 class="card-title" style="color:#166534">
              <i class="fas fa-bullseye" style="color:#166534"></i> Meta a 30 días
            </h3>
          </div>
          <p style="margin:0;font-size:0.95rem;font-weight:600;color:#15803d">${plan.metaAl30Dias}</p>
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
      if (usuario.rol !== 'padre') return;
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
