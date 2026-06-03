(function () {
  'use strict';

  const API = window.AI_SERVICE_URL || 'http://localhost:3001';
  const getToken = () => sessionStorage.getItem('eduGestionToken') || localStorage.getItem('token');

  // Mapa de tendencia a icono/color usando el design system nativo
  const TEND = {
    'Mejorando':  { icon: 'fas fa-arrow-trend-up',   cls: 'stat-trend up'   },
    'Declinando': { icon: 'fas fa-arrow-trend-down',  cls: 'stat-trend down' },
    'Estable':    { icon: 'fas fa-minus',             cls: 'stat-trend'      },
    'Sin datos':  { icon: 'fas fa-question-circle',   cls: 'stat-trend'      }
  };

  const BADGE = {
    alto:  'badge badge-danger',
    medio: 'badge badge-warning',
    ok:    'badge badge-success'
  };
  const BADGE_LABEL = { alto: 'Riesgo Alto', medio: 'Atención', ok: 'Bien' };

  const NIVEL_COLOR = { bajo: 'var(--success)', medio: 'var(--warning)', alto: 'var(--danger)' };

  const ini = (nombre) =>
    (nombre || 'XX').split(' ').slice(0, 2).map(p => (p[0] || '')).join('').toUpperCase();

  const avatar = (nombre) =>
    `<div class="user-item-avatar">${ini(nombre)}</div>`;

  const spinnerCard = (msg = 'Cargando...') =>
    `<div style="text-align:center;padding:40px 20px;color:var(--gray-400)">
      <i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--primary);display:block;margin-bottom:10px"></i>
      <div style="font-size:13px">${msg}</div>
    </div>`;

  const msgError = (txt) =>
    `<div class="mensaje error" style="display:block;margin:0">${txt}</div>`;

  function inyectarMenu() {
    if (document.getElementById('btn-ia-admin')) return;
    const nav = document.querySelector('nav.sidebar-nav');
    if (!nav) return;
    const sec = document.createElement('div');
    sec.className = 'nav-section';
    sec.innerHTML = `
      <div class="nav-section-title">Inteligencia Artificial</div>
      <button class="nav-item" id="btn-ia-admin" onclick="iaAdmin.mostrar(this)">
        <i class="fas fa-brain"></i> Análisis IA
      </button>`;
    nav.appendChild(sec);
  }

  function inyectarPanel() {
    const contenedor = document.querySelector('.page-content');
    if (!contenedor || document.getElementById('ia-panel-admin')) return;

    const panel = document.createElement('div');
    panel.className = 'section';
    panel.id = 'ia-panel-admin';
    panel.innerHTML = `

      <!-- ── Cabecera ─────────────────────────────────────────── -->
      <div class="card-header" style="margin-bottom:20px">
        <h2 class="card-title" style="font-size:1.3rem">
          <i class="fas fa-brain"></i> Análisis IA — Rendimiento Académico
        </h2>
        <span style="font-size:0.85rem;color:var(--gray-500)">Planes de mejora generados con Inteligencia Artificial</span>
      </div>

      <!-- ── Contadores globales ─────────────────────────────── -->
      <div class="stats-grid" id="ia-stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon violet"><i class="fas fa-users"></i></div></div>
          <div class="stat-value" id="ia-total">—</div>
          <div class="stat-label">Total estudiantes</div>
          <div class="stat-bar"><div class="stat-bar-fill violet" id="ia-bar-total" style="width:100%"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon" style="background:#fee2e2;color:var(--danger)"><i class="fas fa-triangle-exclamation"></i></div></div>
          <div class="stat-value" id="ia-alto" style="color:var(--danger)">—</div>
          <div class="stat-label">Riesgo alto</div>
          <div class="stat-bar"><div class="stat-bar-fill" id="ia-bar-alto" style="background:var(--danger);width:0%"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-minus-circle"></i></div></div>
          <div class="stat-value" id="ia-medio" style="color:var(--warning)">—</div>
          <div class="stat-label">Requieren atención</div>
          <div class="stat-bar"><div class="stat-bar-fill" id="ia-bar-medio" style="background:var(--warning);width:0%"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon green"><i class="fas fa-circle-check"></i></div></div>
          <div class="stat-value" id="ia-ok" style="color:var(--success)">—</div>
          <div class="stat-label">En nivel esperado</div>
          <div class="stat-bar"><div class="stat-bar-fill green" id="ia-bar-ok" style="width:0%"></div></div>
        </div>
      </div>

      <!-- ── Layout dos columnas ─────────────────────────────── -->
      <div style="display:grid;grid-template-columns:330px 1fr;gap:24px;align-items:start">

        <!-- LISTA -->
        <div class="card" style="padding:0;overflow:hidden;position:sticky;top:90px">
          <div style="padding:20px 20px 14px;border-bottom:1px solid var(--gray-200)">
            <h3 class="card-title" style="margin-bottom:14px"><i class="fas fa-list"></i> Estudiantes</h3>
            <input id="ia-buscar" type="text" class="form-input" placeholder="Buscar estudiante..."
              style="margin-bottom:10px;padding:10px 14px;font-size:0.9rem"
              oninput="iaAdmin.filtrar(this.value)">
            <select id="ia-filtro" class="form-input" style="padding:10px 14px;font-size:0.9rem;cursor:pointer"
              onchange="iaAdmin.filtrarRiesgo(this.value)">
              <option value="">Todos los niveles</option>
              <option value="alto">Solo riesgo alto</option>
              <option value="medio">Riesgo medio o alto</option>
              <option value="ok">En nivel esperado</option>
            </select>
          </div>
          <div id="ia-lista" style="max-height:calc(100vh - 340px);overflow-y:auto;padding:8px 0">
            ${spinnerCard('Cargando estudiantes...')}
          </div>
        </div>

        <!-- DETALLE -->
        <div id="ia-detalle">
          <div class="card" style="text-align:center;padding:60px 32px">
            <div style="width:72px;height:72px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
              <i class="fas fa-brain" style="font-size:28px;color:var(--primary)"></i>
            </div>
            <h4 style="color:var(--gray-700);font-weight:700;margin-bottom:8px">Selecciona un estudiante</h4>
            <p style="font-size:0.9rem;color:var(--gray-500);max-width:340px;margin:0 auto;line-height:1.7">
              Elige un estudiante de la lista para ver su análisis de rendimiento y plan de mejora generado con IA.
            </p>
          </div>
        </div>

      </div>`;
    contenedor.appendChild(panel);
  }

  window.iaAdmin = {
    todos: [],

    mostrar(btn) {
      if (!document.getElementById('ia-panel-admin')) inyectarPanel();
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('ia-panel-admin').classList.add('active');
      if (btn) btn.classList.add('active');
      if (this.todos.length === 0) this.cargarLista();
    },

    async cargarLista() {
      try {
        const r = await fetch(`${API}/api/ia/admin/estudiantes`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || r.statusText);
        this.todos = d.estudiantes || [];
        this.actualizarStats(this.todos);
        this.renderLista(this.todos);
      } catch (e) {
        document.getElementById('ia-lista').innerHTML =
          `<div style="padding:16px">${msgError('Error: ' + e.message)}</div>`;
      }
    },

    actualizarStats(lista) {
      const total = lista.length;
      const alto  = lista.filter(e => e.nivelRiesgo === 'alto').length;
      const medio = lista.filter(e => e.nivelRiesgo === 'medio').length;
      const ok    = lista.filter(e => e.nivelRiesgo === 'ok').length;
      document.getElementById('ia-total').textContent = total;
      document.getElementById('ia-alto').textContent  = alto;
      document.getElementById('ia-medio').textContent = medio;
      document.getElementById('ia-ok').textContent    = ok;
      document.getElementById('ia-bar-alto').style.width  = total ? (alto / total * 100) + '%' : '0%';
      document.getElementById('ia-bar-medio').style.width = total ? (medio / total * 100) + '%' : '0%';
      document.getElementById('ia-bar-ok').style.width    = total ? (ok / total * 100) + '%' : '0%';
    },

    renderLista(lista) {
      const el = document.getElementById('ia-lista');
      if (!lista.length) {
        el.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:24px;font-size:0.85rem">Sin resultados</p>';
        return;
      }
      const porCurso = {};
      lista.forEach(e => {
        const c = e.nombreCurso || e.curso_id || 'Sin curso';
        if (!porCurso[c]) porCurso[c] = [];
        porCurso[c].push(e);
      });
      let html = '';
      Object.entries(porCurso).sort(([a], [b]) => a.localeCompare(b)).forEach(([curso, ests]) => {
        html += `<div style="padding:6px 20px 2px;font-size:0.7rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.07em;margin-top:6px">${curso}</div>`;
        ests.forEach(est => {
          const eid = String(est.estudiante_id);
          const bc  = BADGE[est.nivelRiesgo] || BADGE.ok;
          const bl  = BADGE_LABEL[est.nivelRiesgo] || 'Bien';
          html += `
            <div class="ia-est-row" data-id="${eid}"
              style="display:flex;align-items:center;gap:12px;padding:9px 20px;cursor:pointer;border-left:3px solid transparent;transition:all .12s;border-bottom:1px solid var(--gray-100)"
              onmouseenter="if(!this.classList.contains('ia-activo')){this.style.background='var(--primary-light)'}"
              onmouseleave="if(!this.classList.contains('ia-activo')){this.style.background=''}"
              onclick="iaAdmin.seleccionar('${eid}',this)">
              <div class="user-item-avatar" style="width:34px;height:34px;font-size:0.75rem">${ini(est.nombre)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:0.85rem;font-weight:600;color:var(--gray-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${est.nombre}</div>
                <div style="font-size:0.75rem;color:var(--gray-500)">
                  ${est.promedioGeneral !== null ? est.promedioGeneral + '/100' : '—'} · ${est.porcentajeAsistencia}%
                </div>
              </div>
              <span class="${bc}" style="font-size:0.7rem;white-space:nowrap">${bl}</span>
            </div>`;
        });
      });
      el.innerHTML = html;
    },

    filtrar(txt) {
      const q = txt.toLowerCase();
      this.renderLista(this.todos.filter(e => (e.nombre || '').toLowerCase().includes(q)));
    },

    filtrarRiesgo(v) {
      const mapa = { alto: ['alto'], medio: ['alto', 'medio'], ok: ['ok'] };
      const filtrado = v ? this.todos.filter(e => (mapa[v] || []).includes(e.nivelRiesgo)) : this.todos;
      this.renderLista(filtrado);
      this.actualizarStats(filtrado);
    },

    async seleccionar(eid, elem) {
      document.querySelectorAll('.ia-est-row').forEach(el => {
        el.style.background = '';
        el.style.borderLeftColor = 'transparent';
        el.classList.remove('ia-activo');
      });
      elem.style.background = 'var(--primary-light)';
      elem.style.borderLeftColor = 'var(--primary)';
      elem.classList.add('ia-activo');

      document.getElementById('ia-detalle').innerHTML =
        `<div class="card">${spinnerCard('Generando análisis con IA...')}</div>`;

      try {
        const r = await fetch(`${API}/api/ia/admin/estudiante/${eid}/plan`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText);
        document.getElementById('ia-detalle').innerHTML = this.renderPlan(data);
      } catch (e) {
        document.getElementById('ia-detalle').innerHTML =
          `<div class="card">${msgError('Error al cargar: ' + e.message)}</div>`;
      }
    },

    renderPlan(data) {
      const { estudiante, indicadores, plan, datosInsuficientes } = data;
      if (!estudiante) return `<div class="card">${msgError('Estudiante no encontrado')}</div>`;

      const nivel = indicadores.nivelRiesgo || 'bajo';
      const nColor = NIVEL_COLOR[nivel] || 'var(--success)';
      const tendMeta = TEND[indicadores.tendencia] || TEND['Sin datos'];

      let h = '';

      // ── Tarjeta cabecera ──────────────────────────────────────────────────
      h += `<div class="card" style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
          <div class="user-item-avatar" style="width:56px;height:56px;font-size:1.1rem;flex-shrink:0">${ini(estudiante.nombre)}</div>
          <div style="flex:1;min-width:0">
            <h3 style="margin:0 0 4px;font-size:1.15rem;font-weight:700;color:var(--gray-900)">${estudiante.nombre}</h3>
            <p style="margin:0;font-size:0.85rem;color:var(--gray-500)">${estudiante.nombreCurso || estudiante.curso_id || ''}</p>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:${nColor}18;border:1px solid ${nColor}40">
              <i class="fas fa-circle" style="font-size:7px;color:${nColor}"></i>
              <span style="font-size:0.8rem;font-weight:700;color:${nColor}">Riesgo ${nivel}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="iaAdmin.regenerar('${estudiante.estudiante_id}')">
              <i class="fas fa-rotate-right"></i> Regenerar
            </button>
          </div>
        </div>
        ${indicadores.porcentajeAsistencia < 85 ? `
          <div class="mensaje" style="display:flex;margin-top:16px;margin-bottom:0;background:#fef3c7;color:#92400e;align-items:center;gap:8px">
            <i class="fas fa-triangle-exclamation"></i>
            <span><strong>Asistencia crítica:</strong> ${indicadores.porcentajeAsistencia}% — requiere atención inmediata.</span>
          </div>` : ''}
      </div>`;

      // ── Métricas (stat-cards) ─────────────────────────────────────────────
      const promCol = indicadores.promedioGeneral < 60 ? 'danger' : indicadores.promedioGeneral < 70 ? 'orange' : 'green';
      const asisCol = indicadores.porcentajeAsistencia < 75 ? 'danger' : indicadores.porcentajeAsistencia < 85 ? 'orange' : 'green';
      const iconsColor = { danger: 'var(--danger)', orange: 'var(--warning)', green: 'var(--success)' };
      const promFill = indicadores.promedioGeneral < 70 ? 'style="background:var(--danger)"' : 'green';

      h += `<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon ${promCol === 'danger' ? '' : promCol === 'orange' ? 'orange' : 'green'}" style="${promCol === 'danger' ? 'background:#fee2e2;color:var(--danger)' : ''}">
              <i class="fas fa-chart-line"></i>
            </div>
          </div>
          <div class="stat-value" style="color:${iconsColor[promCol]}">${indicadores.promedioGeneral}/100</div>
          <div class="stat-label">Promedio general</div>
          <div class="stat-bar"><div class="stat-bar-fill" style="width:${indicadores.promedioGeneral}%;background:${iconsColor[promCol]}"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon ${asisCol === 'danger' ? '' : asisCol === 'orange' ? 'orange' : 'green'}" style="${asisCol === 'danger' ? 'background:#fee2e2;color:var(--danger)' : ''}">
              <i class="fas fa-calendar-check"></i>
            </div>
          </div>
          <div class="stat-value" style="color:${iconsColor[asisCol]}">${indicadores.porcentajeAsistencia}%</div>
          <div class="stat-label">Asistencia</div>
          <div class="stat-bar"><div class="stat-bar-fill" style="width:${indicadores.porcentajeAsistencia}%;background:${iconsColor[asisCol]}"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon violet"><i class="${tendMeta.icon}"></i></div>
            <span class="${tendMeta.cls}" style="font-size:0.7rem">${indicadores.tendencia}</span>
          </div>
          <div class="stat-value" style="font-size:1.1rem;color:var(--gray-700)">${indicadores.tendencia}</div>
          <div class="stat-label">Tendencia</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon blue"><i class="fas fa-handshake"></i></div>
          </div>
          <div class="stat-value">${indicadores.scoreComportamiento}/100</div>
          <div class="stat-label">Convivencia</div>
          <div class="stat-bar"><div class="stat-bar-fill violet" style="width:${indicadores.scoreComportamiento}%"></div></div>
        </div>
      </div>`;

      // ── Rendimiento por materia ───────────────────────────────────────────
      if (indicadores.materiasOrdenadas?.length > 0) {
        h += `<div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-chart-bar"></i> Rendimiento por materia</h3>
            <span style="font-size:0.8rem;color:var(--gray-400)">${indicadores.materiasOrdenadas.length} materia${indicadores.materiasOrdenadas.length !== 1 ? 's' : ''}</span>
          </div>`;
        indicadores.materiasOrdenadas.forEach(m => {
          const pct  = Math.min(100, m.nota);
          const fill = m.nota < 60 ? 'style="background:var(--danger)"' : m.nota < 70 ? 'style="background:var(--warning)"' : 'green';
          const numColor = m.nota < 60 ? 'var(--danger)' : m.nota < 70 ? 'var(--warning)' : 'var(--success)';
          h += `<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
            <span style="width:170px;font-size:0.85rem;color:var(--gray-700);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0" title="${m.nombre}">${m.nombre}</span>
            <div class="stat-bar" style="flex:1;margin:0;height:8px">
              <div class="stat-bar-fill ${fill.startsWith('g') ? fill : ''}" ${fill.startsWith('s') ? fill : ''} style="width:${pct}%;${fill.startsWith('s') ? fill.slice(6) : ''}"></div>
            </div>
            <span style="width:38px;text-align:right;font-size:0.85rem;font-weight:700;color:${numColor}">${m.nota}</span>
          </div>`;
        });
        h += '</div>';
      }

      // ── Plan de mejora ────────────────────────────────────────────────────
      if (datosInsuficientes) {
        h += `<div class="mensaje" style="display:block">Sin calificaciones registradas aún para este estudiante.</div>`;
      } else if (plan) {
        // Diagnóstico
        const diagBg = { bajo: '#d1fae5', medio: '#fef3c7', alto: '#fee2e2' }[nivel] || '#d1fae5';
        const diagColor = { bajo: '#065f46', medio: '#92400e', alto: '#991b1b' }[nivel] || '#065f46';
        h += `<div class="card" style="margin-bottom:20px;border-left:4px solid ${nColor};border-radius:0 var(--radius) var(--radius) 0">
          <div class="card-header" style="margin-bottom:12px">
            <h3 class="card-title" style="font-size:0.85rem;text-transform:uppercase;letter-spacing:.06em;color:${nColor}">
              <i class="fas fa-stethoscope" style="color:${nColor}"></i> Diagnóstico IA
            </h3>
          </div>
          <p style="margin:0;font-size:0.9rem;line-height:1.75;color:var(--gray-700)">${plan.diagnostico}</p>
        </div>`;

        // Plan semanal
        if (plan.planSemanal?.length > 0) {
          const semStyles = [
            { bg: 'var(--primary-light)', border: '#c4b5fd', color: 'var(--primary-dark, #5A52D5)' },
            { bg: '#dbeafe',              border: '#93c5fd', color: '#1d4ed8' },
            { bg: '#fef3c7',              border: '#fcd34d', color: '#92400e' },
            { bg: '#d1fae5',              border: '#6ee7b7', color: '#065f46' }
          ];
          h += `<div class="card" style="margin-bottom:20px">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-calendar-days"></i> Plan de mejora — 4 semanas</h3>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">`;
          plan.planSemanal.forEach((s, i) => {
            const st = semStyles[i % semStyles.length];
            const acc = Array.isArray(s.acciones) ? s.acciones.filter(a => a?.trim()) : [];
            h += `<div style="background:${st.bg};border:1px solid ${st.border};border-radius:var(--radius-sm);padding:16px">
              <div style="font-size:0.75rem;font-weight:700;color:${st.color};text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">
                Semana ${s.semana} · ${(s.enfoque || '').toUpperCase()}
              </div>
              ${acc.length > 0
                ? `<ul style="margin:0;padding-left:18px">${acc.map(a => `<li style="font-size:0.85rem;margin-bottom:5px;line-height:1.55;color:var(--gray-700)">${a}</li>`).join('')}</ul>`
                : `<p style="font-size:0.82rem;color:var(--gray-400);margin:0;font-style:italic">Sin acciones definidas</p>`
              }
            </div>`;
          });
          h += '</div></div>';
        }

        // Estrategias por materia
        if (plan.recomendacionesPorMateria?.length > 0) {
          h += `<div class="card" style="margin-bottom:20px">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-lightbulb"></i> Estrategias por materia</h3>
            </div>
            <div class="user-list" style="margin-top:0">`;
          plan.recomendacionesPorMateria.forEach(m => {
            h += `<div class="user-item">
              <div class="user-item-info">
                <div class="stat-icon" style="background:#fee2e2;color:var(--danger);width:36px;height:36px;font-size:0.8rem;border-radius:var(--radius-sm)">
                  ${m.nota}
                </div>
                <div class="user-item-details">
                  <h4 style="font-size:0.9rem">${m.materia}</h4>
                  <p style="font-size:0.8rem;line-height:1.5">${m.estrategia}</p>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">
                    ${(m.recursos || []).map(r => `<span class="badge badge-violet" style="font-size:0.7rem">${r}</span>`).join('')}
                  </div>
                </div>
              </div>
            </div>`;
          });
          h += '</div></div>';
        }

        // Meta 30 días
        if (plan.metaAl30Dias) {
          h += `<div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:#86efac">
            <div class="card-header" style="margin-bottom:10px">
              <h3 class="card-title" style="color:#166534"><i class="fas fa-bullseye" style="color:#16a34a"></i> Meta a 30 días</h3>
            </div>
            <p style="margin:0;font-size:0.9rem;font-weight:600;color:#15803d;line-height:1.6">${plan.metaAl30Dias}</p>
          </div>`;
        }

        // Alerta padres
        if (plan.alertaParaPadres) {
          h += `<div class="card" style="background:#fef3c7;border-color:#fcd34d">
            <div class="card-header" style="margin-bottom:10px">
              <h3 class="card-title" style="color:#92400e"><i class="fas fa-house-user" style="color:#d97706"></i> Para el acudiente</h3>
            </div>
            <p style="margin:0;font-size:0.9rem;color:#78350f;line-height:1.6">${plan.alertaParaPadres}</p>
          </div>`;
        }
      }

      // Pie
      h += `<div style="font-size:0.75rem;color:var(--gray-400);text-align:right;margin-top:8px;padding-top:8px;border-top:1px solid var(--gray-200)">
        ${data.fromCache ? '<i class="fas fa-bolt" style="color:var(--warning);margin-right:3px"></i>Desde caché · ' : ''}
        <i class="fas fa-clock" style="margin-right:3px"></i>${new Date(data.generadoEn).toLocaleString()}
      </div>`;

      return h;
    },

    async regenerar(eid) {
      document.getElementById('ia-detalle').innerHTML =
        `<div class="card">${spinnerCard('Regenerando plan...')}</div>`;
      try {
        const r = await fetch(`${API}/api/ia/admin/estudiante/${eid}/regenerar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText);
        document.getElementById('ia-detalle').innerHTML = this.renderPlan(data);
      } catch (e) {
        document.getElementById('ia-detalle').innerHTML =
          `<div class="card">${msgError('Error al regenerar: ' + e.message)}</div>`;
      }
    }
  };

  function init() {
    if (document.getElementById('ia-panel-admin')) return;
    const u = sessionStorage.getItem('eduGestionUser');
    if (!u) return;
    try {
      const usuario = JSON.parse(u);
      if (!['admin', 'rector', 'coordinador'].includes(usuario.rol)) return;
    } catch { return; }
    inyectarMenu();
    inyectarPanel();
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
  setTimeout(init, 300);
  setTimeout(init, 1000);
})();
