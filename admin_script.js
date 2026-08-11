
        // ===== CONFIG =====
        const API = '/api';
        const loaded = {};

        // 🔒 JWT: Interceptor global de fetch — inyecta token en TODAS las requests
        const _originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            const token = sessionStorage.getItem('eduGestionToken');
            if (token) {
                options.headers = options.headers || {};
                if (options.headers instanceof Headers) {
                    options.headers.set('Authorization', 'Bearer ' + token);
                } else {
                    options.headers['Authorization'] = 'Bearer ' + token;
                }
            }
            return _originalFetch(url, options).then(response => {
                if (response.status === 401) {
                    sessionStorage.clear();
                    window.location.href = '/login';
                }
                return response;
            });
        };

        // ===== Navigation =====
        function mostrarSeccion(id, btn) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const secMap = { dashboard: 'secDashboard', profesores: 'secProfesores', estudiantes: 'secEstudiantes', acudientes: 'secAcudientes', asignaturas: 'secAsignaturas', cursos: 'secCursos', pensum: 'secPensum', logros: 'secLogros', indicadores: 'secIndicadores', horarios: 'secHorarios', horarioAtencion: 'secHorarioAtencion', asistencia: 'secAsistencia', calificaciones: 'secCalificaciones', observador: 'secObservador', pagos: 'secPagos', boletines: 'secBoletines', anuncios: 'secAnuncios', reportes: 'secReportes', notificaciones: 'secNotificaciones', configAvanzada: 'secConfigAvanzada', sedes: 'secSedes' };
            document.getElementById(secMap[id]).classList.add('active');
            if (btn) btn.classList.add('active');
            const titles = { dashboard: 'Panel <span>Administrador</span>', profesores: 'Gestión de <span>Docentes</span>', estudiantes: 'Gestión de <span>Estudiantes</span>', acudientes: 'Gestión de <span>Acudientes</span>', asignaturas: '<span>Asignaturas</span>', cursos: 'Gestión de <span>Cursos</span>', pensum: '<span>Pensum</span>', logros: '<span>Logros</span>', indicadores: 'Indicadores de <span>Comportamiento</span>', horarios: '<span>Horario</span> General', horarioAtencion: 'Horario de <span>Atención</span>', asistencia: 'Control de <span>Asistencia</span>', calificaciones: 'Registro de <span>Calificaciones</span>', observador: 'Observador del <span>Estudiante</span>', pagos: '<span>Pagos</span>', boletines: '<span>Boletines</span>', anuncios: '<span>Anuncios</span>', reportes: '<span>Reportes</span> Académicos', notificaciones: '<span>Notificaciones</span>', configAvanzada: '⚙️ <span>Configuración</span>', sedes: '🏫 Gestión de <span>Sedes</span>' };
            document.getElementById('headerTitle').innerHTML = titles[id] || 'Panel <span>Administrador</span>';
            if (window.innerWidth <= 768) closeSidebar();
            // Cargar datos al navegar
            cargarDatosSeccion(id);
        }

        // ===== Sidebar Toggle =====
        function closeSidebar() {
            const sb = document.getElementById('sidebar');
            const sbo = document.getElementById('sidebarOverlay');
            if (sb) sb.classList.remove('open');
            if (sbo) sbo.classList.remove('active');
        }

        function toggleSidebar() {
            const sb = document.getElementById('sidebar');
            const sbo = document.getElementById('sidebarOverlay');
            if (sb) sb.classList.toggle('open');
            if (sbo) sbo.classList.toggle('active');
        }

        // ===== Dark Mode =====
        const dm = document.getElementById('darkModeToggle');
        dm.checked = localStorage.getItem('darkMode') === 'true';
        if (dm.checked) document.body.classList.add('dark-mode');
        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            document.documentElement.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', dm.checked);
        }

        // ===== Logout =====
        function confirmarLogout() { document.getElementById('logoutOverlay').classList.add('show'); document.getElementById('logoutModal').classList.add('show') }
        function cerrarLogout() { document.getElementById('logoutOverlay').classList.remove('show'); document.getElementById('logoutModal').classList.remove('show') }
        document.getElementById('logoutOverlay').addEventListener('click', cerrarLogout);

        function initCharts() {
            const ctxRend = document.getElementById('chartRendimiento');
            if (ctxRend) {
                new Chart(ctxRend, { type: 'bar', data: { labels: ['Matemáticas', 'Ciencias', 'Español', 'Historia', 'Inglés', 'Artes'], datasets: [{ label: 'Promedio', data: [4.2, 3.8, 4.0, 3.5, 4.1, 4.5], backgroundColor: 'rgba(108,99,255,0.2)', borderColor: '#6C63FF', borderWidth: 2, borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5 } } } });
            }
            if (document.getElementById('chartReportes')) {
                new Chart(document.getElementById('chartReportes'), { type: 'line', data: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], datasets: [{ label: 'Aprobados', data: [85, 87, 83, 89, 90, 87], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 }, { label: 'En riesgo', data: [15, 13, 17, 11, 10, 13], borderColor: '#FF6584', backgroundColor: 'rgba(255,101,132,0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
            }
        }
        initCharts();

        function abrirPerfil() { alert('Perfil del administrador') }

        // =========================================================
        // 📡 CARGA DE DATOS DESDE API
        // =========================================================
        function getInitials(nombre) {
            if (!nombre) return '??';
            const parts = nombre.trim().split(/\s+/);
            return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
        }
        const avatarColors = ['#6C63FF', '#FF6584', '#10b981', '#f59e0b', '#8B5CF6', '#ec4899', '#06b6d4', '#f97316'];
        function getAvatarColor(i) { return avatarColors[i % avatarColors.length]; }
        // Escala de colores para notas: Rojo (0-69.99), Amarillo (70-79.99), Azul (80-94.99), Verde (95-100)
        function colorNota(n) { return n >= 95 ? '#27ae60' : n >= 80 ? '#2980b9' : n >= 70 ? '#f1c40f' : '#e74c3c'; }
        function colorIndicador(lbl) { return lbl === 'MUY SUPERIOR' ? '#27ae60' : lbl === 'SUPERIOR' ? '#2980b9' : lbl === 'BÁSICO' ? '#e6a817' : '#e74c3c'; }

        async function cargarDatosSeccion(id) {
            try {
                switch (id) {
                    case 'dashboard': await cargarDashboard(); break;
                    case 'profesores': await cargarDocentes(); break;
                    case 'estudiantes': await cargarEstudiantes(); break;
                    case 'acudientes': await cargarAcudientes(); break;
                    case 'asignaturas': await cargarAsignaturas(); break;
                    case 'cursos': await cargarCursos(); break;
                    case 'pensum': await cargarPensum(); break;
                    case 'logros': await cargarLogros(); break;
                    case 'indicadores': await cargarIndicadores(); break;
                    case 'calificaciones': await cargarCalificaciones(); break;
                    case 'asistencia': await cargarAsistencia(); break;
                    case 'observador': await cargarObservaciones(); break;
                    case 'boletines': await cargarBoletinCursos(); break;
                    case 'horarios': await cargarHorarios(); break;
                    case 'horarioAtencion': await cargarHorariosAtencion(); break;
                    case 'pagos': await cargarPagos(); break;
                    case 'anuncios': await cargarAnuncios(); break;
                    case 'reportes': await cargarReportes(); break;
                                        case 'configAvanzada': await initConfigAvanzada(); break;
                    case 'sedes': await cargarSedes(); break;
                }
            } catch (err) {
                console.error(`Error cargando ${id}:`, err);
            }
        }

        // ── EXPORTAR CSV ──
        async function exportarCSV(seccion) {
            const configs = {
                profesores: {
                    url: `${API}/docentes`,
                    filename: 'docentes.csv',
                    transform: data => data,
                    columns: { nombre: 'Nombre', identi: 'Cédula', especialidad: 'Especialidad', telefono: 'Teléfono', email: 'Email', estado: 'Estado' }
                },
                estudiantes: {
                    url: `${API}/estudiantes`,
                    filename: 'estudiantes.csv',
                    transform: data => data.estudiantes || data,
                    columns: { nombre: 'Nombre', estudiante_id: 'Código', curso: 'Curso', telefono: 'Teléfono', email: 'Email', estado_est: 'Estado' }
                },
                asignaturas: {
                    url: `${API}/asignaturas`,
                    filename: 'asignaturas.csv',
                    transform: data => data,
                    columns: { nombre: 'Nombre', codigo: 'Código', docente: 'Docente', estado: 'Estado' }
                },
                cursos: {
                    url: `${API}/cursos`,
                    filename: 'cursos.csv',
                    transform: data => data,
                    columns: { nombre: 'Nombre', curso_id: 'Código', docente_nombre: 'Docente', estado: 'Estado' }
                },
                pensum: {
                    url: `${API}/pensum`,
                    filename: 'pensum.csv',
                    transform: data => data,
                    columns: { nombre: 'Nombre', curso_codigo: 'Curso', docente: 'Docente', asignatura: 'Asignatura', int_horaria: 'Int. Horaria', estado: 'Estado' }
                },
                logros: {
                    url: `${API}/logros`,
                    filename: 'logros.csv',
                    transform: data => data,
                    columns: { descripcion: 'Descripción', asignatura: 'Asignatura', pensum: 'Pensum', periodo: 'Periodo', estado: 'Estado' }
                },
                asistencia: {
                    url: `${API}/asistencia`,
                    filename: 'asistencia.csv',
                    transform: data => data.registros || data,
                    columns: { estudiante: 'Estudiante', fecha: 'Fecha', asistencia: 'Estado', pensum: 'Pensum', observacion: 'Observación' }
                },
                horarios: {
                    url: `${API}/horarios`,
                    filename: 'horarios.csv',
                    transform: data => data,
                    columns: { curso: 'Curso', dia: 'Día', hora: 'Hora', asignatura: 'Asignatura', docente: 'Docente', aula: 'Aula' }
                }
            };

            const config = configs[seccion];
            if (!config) { alert('Sección no soportada'); return; }

            try {
                const res = await fetch(config.url);
                const rawData = await res.json();
                const data = config.transform(rawData);

                if (!data || data.length === 0) { alert('No hay datos para exportar'); return; }

                const headers = Object.values(config.columns);
                const keys = Object.keys(config.columns);

                let csv = '\uFEFF'; // BOM for Excel UTF-8
                csv += headers.join(';') + '\n';
                data.forEach(row => {
                    csv += keys.map(k => {
                        let val = row[k] !== undefined && row[k] !== null ? String(row[k]) : '';
                        val = val.replace(/"/g, '""');
                        if (val.includes(';') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
                        return val;
                    }).join(';') + '\n';
                });

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = config.filename;
                link.click();
                URL.revokeObjectURL(link.href);
            } catch (err) {
                alert('Error exportando: ' + err.message);
            }
        }

        // ── CALENDARIO ACADÉMICO ──
        let calMes = new Date().getMonth();
        let calAnno = new Date().getFullYear();

        const eventosAcademicos = [
            { fecha: '2026-01-19', tipo: 'inicio', label: 'Inicio Clases', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Inicio oficial del año escolar 2026. Presentación de docentes y orientación general.' },
            { fecha: '2026-01-19', tipo: 'periodo', label: 'Inicio P1', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Inicio del primer periodo académico. Entrega de planillas a docentes.' },
            { fecha: '2026-03-27', tipo: 'examen', label: 'Evaluaciones P1', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Semana de evaluaciones finales del primer periodo.' },
            { fecha: '2026-03-30', tipo: 'receso', label: 'Semana Santa', creador: 'Rectoría', curso: 'Todos', desc: 'Receso de Semana Santa. No hay actividades académicas.' },
            { fecha: '2026-03-31', tipo: 'receso', label: 'Semana Santa', creador: 'Rectoría', curso: 'Todos', desc: 'Receso de Semana Santa.' },
            { fecha: '2026-04-01', tipo: 'receso', label: 'Semana Santa', creador: 'Rectoría', curso: 'Todos', desc: 'Receso de Semana Santa.' },
            { fecha: '2026-04-02', tipo: 'receso', label: 'Semana Santa', creador: 'Rectoría', curso: 'Todos', desc: 'Receso de Semana Santa.' },
            { fecha: '2026-04-03', tipo: 'receso', label: 'Semana Santa', creador: 'Rectoría', curso: 'Todos', desc: 'Receso de Semana Santa.' },
            { fecha: '2026-04-06', tipo: 'periodo', label: 'Inicio P2', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Inicio del segundo periodo académico.' },
            { fecha: '2026-04-10', tipo: 'boletin', label: 'Entrega Boletines P1', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Reunión de padres y entrega de boletines del primer periodo.' },
            { fecha: '2026-06-05', tipo: 'examen', label: 'Evaluaciones P2', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Semana de evaluaciones finales del segundo periodo.' },
            { fecha: '2026-06-15', tipo: 'receso', label: 'Vacaciones Mitad Año', creador: 'Rectoría', curso: 'Todos', desc: 'Inicio del receso de mitad de año. Regreso el 6 de julio.' },
            { fecha: '2026-07-06', tipo: 'periodo', label: 'Inicio P3', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Inicio del tercer periodo académico.' },
            { fecha: '2026-07-10', tipo: 'boletin', label: 'Entrega Boletines P2', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Reunión de padres y entrega de boletines del segundo periodo.' },
            { fecha: '2026-09-11', tipo: 'examen', label: 'Evaluaciones P3', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Semana de evaluaciones finales del tercer periodo.' },
            { fecha: '2026-09-28', tipo: 'periodo', label: 'Inicio P4', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Inicio del cuarto y último periodo académico.' },
            { fecha: '2026-10-02', tipo: 'boletin', label: 'Entrega Boletines P3', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Reunión de padres y entrega de boletines del tercer periodo.' },
            { fecha: '2026-10-12', tipo: 'festivo', label: 'Día de la Raza', creador: 'Rectoría', curso: 'Todos', desc: 'Día festivo nacional. No hay clases.' },
            { fecha: '2026-11-02', tipo: 'festivo', label: 'Día de los Difuntos', creador: 'Rectoría', curso: 'Todos', desc: 'Día festivo nacional. No hay clases.' },
            { fecha: '2026-11-16', tipo: 'festivo', label: 'Independencia de Cartagena', creador: 'Rectoría', curso: 'Todos', desc: 'Día festivo nacional. No hay clases.' },
            { fecha: '2026-11-20', tipo: 'examen', label: 'Evaluaciones P4', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Semana de evaluaciones del cuarto periodo.' },
            { fecha: '2026-11-27', tipo: 'boletin', label: 'Entrega Boletines P4', creador: 'Coordinación Académica', curso: 'Todos', desc: 'Reunión final de padres y entrega de boletines P4.' },
            { fecha: '2026-11-30', tipo: 'fin', label: 'Fin Año Escolar', creador: 'Rectoría', curso: 'Todos', desc: 'Cierre oficial del año escolar 2026. Clausura y graduación.' },
            { fecha: '2026-12-08', tipo: 'festivo', label: 'Inmaculada Concepción', creador: 'Rectoría', curso: 'Todos', desc: 'Día festivo nacional.' },
        ];

        const tipoColores = {
            inicio: '#10b981', periodo: '#3b82f6', examen: '#ef4444',
            receso: '#f59e0b', boletin: '#8B5CF6', festivo: '#e5566f', fin: '#6C63FF'
        };
        const tipoLabels = { inicio: 'Inicio', periodo: 'Periodo', examen: 'Evaluación', receso: 'Receso', boletin: 'Boletín', festivo: 'Festivo', fin: 'Cierre' };

        function verEventoCalendario(fechaStr) {
            const evts = eventosAcademicos.filter(e => e.fecha === fechaStr);
            if (!evts.length) return;
            const mN = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const p = fechaStr.split('-');
            const fDisp = `${parseInt(p[2])} de ${mN[parseInt(p[1]) - 1]} ${p[0]}`;
            let ct = evts.map(e => {
                const col = tipoColores[e.tipo] || '#999';
                return `<div style="border:1px solid var(--gray-200);border-radius:10px;padding:16px;margin-bottom:12px;background:var(--surface)">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                        <span style="background:${col};color:#fff;padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700">${tipoLabels[e.tipo] || e.tipo}</span>
                        <span style="font-weight:700;font-size:1rem;flex:1">${e.label}</span>
                    </div>
                    <p style="margin:0 0 12px;font-size:0.85rem;color:var(--gray-600);line-height:1.5">${e.desc}</p>
                    <div style="display:flex;gap:16px;flex-wrap:wrap">
                        <div style="display:flex;align-items:center;gap:6px"><i class="fas fa-user" style="color:var(--primary);font-size:0.8rem"></i><span style="font-size:0.8rem"><b>Creado por:</b> ${e.creador}</span></div>
                        <div style="display:flex;align-items:center;gap:6px"><i class="fas fa-graduation-cap" style="color:var(--primary);font-size:0.8rem"></i><span style="font-size:0.8rem"><b>Curso:</b> ${e.curso}</span></div>
                    </div>
                </div>`;
            }).join('');
            const ov = document.createElement('div');
            ov.id = 'calEventOverlay';
            ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)';
            ov.innerHTML = `<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                    <div style="display:flex;align-items:center;gap:10px"><i class="fas fa-calendar-day" style="color:var(--primary);font-size:1.1rem"></i><span style="font-weight:700;font-size:1rem">${fDisp}</span></div>
                    <button onclick="document.getElementById('calEventOverlay').remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--gray-500);padding:4px 8px"><i class="fas fa-times"></i></button>
                </div>${ct}</div>`;
            ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
            document.body.appendChild(ov);
        }

        function navCalendario(dir) {
            calMes += dir;
            if (calMes > 11) { calMes = 0; calAnno++; }
            if (calMes < 0) { calMes = 11; calAnno--; }
            renderCalendarioAcademico();
        }

        function renderCalendarioAcademico() {
            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const diasSem = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
            const cont = document.getElementById('calendarioAcademicoContainer');
            const label = document.getElementById('calMesAnno');
            if (!cont) return;
            label.textContent = meses[calMes] + ' ' + calAnno;

            const primerDia = new Date(calAnno, calMes, 1);
            const ultimoDia = new Date(calAnno, calMes + 1, 0).getDate();
            let startDay = primerDia.getDay() - 1;
            if (startDay < 0) startDay = 6;

            const hoy = new Date();
            const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

            const mesStr = `${calAnno}-${String(calMes + 1).padStart(2, '0')}`;
            const eventsMes = eventosAcademicos.filter(e => e.fecha.startsWith(mesStr));

            let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">';
            diasSem.forEach(d => { html += `<div style="text-align:center;font-size:0.8rem;font-weight:700;color:var(--gray-500);padding:6px 0">${d}</div>`; });
            html += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">';

            for (let i = 0; i < startDay; i++) {
                html += '<div style="min-height:38px"></div>';
            }

            for (let d = 1; d <= ultimoDia; d++) {
                const fechaStr = `${calAnno}-${String(calMes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const esHoy = fechaStr === hoyStr;
                const evts = eventsMes.filter(e => e.fecha === fechaStr);
                const hasDot = evts.length > 0;
                const dotColor = hasDot ? tipoColores[evts[0].tipo] || '#999' : '';
                const tooltip = hasDot ? evts.map(e => e.label).join(', ') : '';

                html += `<div style="text-align:center;padding:8px 4px;border-radius:8px;font-size:0.9rem;min-height:38px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:${hasDot ? 'pointer' : 'default'};position:relative;transition:background 0.15s;
                    ${esHoy ? 'background:var(--primary);color:#fff;font-weight:700;box-shadow:0 2px 10px rgba(108,99,255,0.35)' : hasDot ? 'background:var(--gray-50);font-weight:600' : ''}"
                    ${hasDot ? `onclick="verEventoCalendario('${fechaStr}')" title="${tooltip}"` : ''}>
                    ${d}
                    ${hasDot ? `<div style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:${dotColor}"></div>` : ''}
                </div>`;
            }
            html += '</div>';

            // Upcoming events
            const upcoming = eventosAcademicos.filter(e => e.fecha >= hoyStr).slice(0, 4);
            if (upcoming.length > 0) {
                html += '<div style="margin-top:16px;border-top:1px solid var(--gray-100);padding-top:12px">';
                html += '<div style="font-size:0.75rem;font-weight:700;color:var(--gray-500);margin-bottom:8px">Próximos eventos</div>';
                upcoming.forEach(e => {
                    const col = tipoColores[e.tipo] || '#999';
                    const parts = e.fecha.split('-');
                    const dateLabel = `${parseInt(parts[2])} ${meses[parseInt(parts[1]) - 1].substring(0, 3)}`;
                    html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px;cursor:pointer" onclick="verEventoCalendario('${e.fecha}')">
                        <div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></div>
                        <span style="font-size:0.8rem;color:var(--gray-600);flex:1">${e.label}</span>
                        <span style="font-size:0.75rem;color:var(--gray-400)">${dateLabel}</span>
                    </div>`;
                });
                html += '</div>';
            }

            cont.innerHTML = html;
        }

        // ── DASHBOARD ──
        async function cargarDashboard() {
            const res = await fetch(`${API}/dashboard/stats`);
            const data = await res.json();
            document.getElementById('totalProfesores').textContent = data.docentes;
            document.getElementById('totalEstudiantes').textContent = data.estudiantes;
            document.getElementById('cursosActivos').textContent = data.cursos;

            // Calendario Académico
            renderCalendarioAcademico();

            // Actividad Reciente (dinámico)
            const actCont = document.getElementById('actividadReciente');
            if (data.actividadReciente && data.actividadReciente.length > 0) {
                const iconMap = { observacion: 'fa-eye', estudiante: 'fa-user-graduate' };
                const colorMap = { observacion: '#6C63FF,#8B5CF6', estudiante: '#10b981,#059669' };
                actCont.innerHTML = data.actividadReciente.map(a => {
                    const initials = (a.titulo || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                    const grad = colorMap[a.tipo] || '#6C63FF,#8B5CF6';
                    return `
                        <div class="user-item">
                            <div class="user-item-info">
                                <div class="user-item-avatar" style="background:linear-gradient(135deg,${grad})">${initials}</div>
                                <div class="user-item-details">
                                    <h4>${a.titulo}</h4>
                                    <p>${a.descripcion}</p>
                                </div>
                            </div>
                        </div>`;
                }).join('');
            } else {
                actCont.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">No hay actividad reciente</div>';
            }
        }

        // ── DOCENTES ──
        async function cargarDocentes() {
            const res = await fetch(`${API}/docentes`);
            const docentes = await res.json();
            const tbody = document.getElementById('tablaProfesores');
            tbody.innerHTML = docentes.map((d, i) => `
                <tr>
                    <td><div style="display:flex;align-items:center;gap:10px">
                        <div class="user-item-avatar" style="width:32px;height:32px;font-size:0.75rem;background:${getAvatarColor(i)}">${getInitials(d.nombre)}</div>${d.nombre}
                    </div></td>
                    <td>${d.identi || d.teacher_id}</td>
                    <td>${d.especialidad || '—'}</td>
                    <td>${d.coordinador === 'S' ? '<span class=\"badge badge-violet\">Coordinador</span>' : '—'}</td>
                    <td><span class="badge badge-${d.estado === 'A' ? 'success' : 'warning'}">${d.estado === 'A' ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarDocente('${d.teacher_id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarDocente('${d.teacher_id}','${(d.nombre || '').replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // =========================================================
        // 📝 CRUD DOCENTES
        // =========================================================
        const docFieldMap = {
            doc_nombre: 'nombre', doc_identi: 'identi', doc_fecha_nacimiento: 'fecha_nacimiento',
            doc_sexo: 'sexo', doc_grupo_sangre: 'grupo_sangre', doc_religion: 'religion',
            doc_eps: 'eps', doc_pension: 'pension', doc_escalafon: 'escalafon',
            doc_especialidad: 'especialidad', doc_coordinador: 'coordinador',
            doc_direccion: 'direccion', doc_telefono: 'telefono', doc_email: 'email'
        };

        function abrirNuevoDocente() {
            document.getElementById('docEditId').value = '';
            document.getElementById('modalDocenteTitulo').innerHTML = '<i class="fas fa-chalkboard-teacher" style="color:var(--primary)"></i> Nuevo Docente';
            Object.keys(docFieldMap).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('doc_coordinador').value = 'N';
            document.getElementById('modalProfesor').classList.add('show');
        }

        async function editarDocente(id) {
            try {
                const res = await fetch(`${API}/docentes/${id}`);
                const doc = await res.json();
                document.getElementById('docEditId').value = id;
                document.getElementById('modalDocenteTitulo').innerHTML = '<i class="fas fa-edit" style="color:var(--primary)"></i> Editar Docente';
                for (const [htmlId, dbField] of Object.entries(docFieldMap)) {
                    const el = document.getElementById(htmlId);
                    if (el && doc[dbField] !== undefined && doc[dbField] !== null) {
                        if (el.type === 'date' && doc[dbField]) el.value = doc[dbField].substring(0, 10);
                        else el.value = doc[dbField];
                    }
                }
                document.getElementById('modalProfesor').classList.add('show');
            } catch (err) { alert('Error cargando docente: ' + err.message); }
        }

        function eliminarDocente(id, nombre) {
            document.getElementById('elimDocId').value = id;
            document.getElementById('elimDocNombre').textContent = nombre;
            document.getElementById('modalEliminarDocente').classList.add('show');
        }

        async function confirmarEliminarDocente() {
            const id = document.getElementById('elimDocId').value;
            try {
                const res = await fetch(`${API}/docentes/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalEliminarDocente').classList.remove('show');
                    loaded['profesores'] = false; await cargarDocentes(); loaded['profesores'] = true;
                    loaded['dashboard'] = false; cargarDatosSeccion('dashboard');
                } else { alert('Error: ' + (data.error || 'No se pudo eliminar')); }
            } catch (err) { alert('Error eliminando: ' + err.message); }
        }

        async function guardarDocente() {
            const nombre = document.getElementById('doc_nombre').value.trim();
            const identi = document.getElementById('doc_identi').value.trim();
            if (!nombre || !identi) { alert('Nombre y Cédula son obligatorios'); return; }
            const body = {};
            for (const [htmlId, dbField] of Object.entries(docFieldMap)) {
                const el = document.getElementById(htmlId);
                if (el && el.value.trim()) body[dbField] = el.value.trim();
            }
            const editId = document.getElementById('docEditId').value;
            const isEdit = !!editId;
            try {
                const res = await fetch(`${API}/docentes${isEdit ? '/' + editId : ''}`, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    cerrarModalDocente();
                    loaded['profesores'] = false; await cargarDocentes(); loaded['profesores'] = true;
                    loaded['dashboard'] = false; cargarDatosSeccion('dashboard');
                } else { alert('Error: ' + (data.error || 'No se pudo guardar')); }
            } catch (err) { alert('Error guardando: ' + err.message); }
        }

        function cerrarModalDocente() { document.getElementById('modalProfesor').classList.remove('show'); }

        // ── ESTUDIANTES ──
        async function cargarEstudiantes() {
            const res = await fetch(`${API}/estudiantes?limit=200`);
            const data = await res.json();
            const tbody = document.getElementById('tablaEstudiantes');
            tbody.innerHTML = data.estudiantes.map((e, i) => `
                <tr id="est-row-${e.estudiante_id}">
                    <td><div style="display:flex;align-items:center;gap:10px">
                        <div style="position:relative;flex-shrink:0;width:36px;height:36px">
                            <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:2px solid var(--primary-light)">
                                ${e.foto && e.foto.length > 10
                                    ? `<img src="${e.foto}" id="est-avatar-${e.estudiante_id}"
                                           style="width:36px;height:36px;min-width:36px;max-width:36px;min-height:36px;max-height:36px;object-fit:cover;display:block"
                                           onerror="this.style.display='none';document.getElementById('est-ini-${e.estudiante_id}').style.display='flex'">`
                                    : `<img src="" id="est-avatar-${e.estudiante_id}"
                                           style="width:36px;height:36px;min-width:36px;max-width:36px;min-height:36px;max-height:36px;object-fit:cover;display:none">`
                                }
                                <div id="est-ini-${e.estudiante_id}" class="user-item-avatar"
                                     style="width:36px;height:36px;font-size:0.75rem;background:${getAvatarColor(i)};${e.foto && e.foto.length > 10 ? 'display:none' : 'display:flex'}">
                                    ${getInitials(e.nombre)}
                                </div>
                            </div>
                            <label for="est-foto-input-${e.estudiante_id}" title="Cambiar foto"
                                style="position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:1.5px solid #fff;z-index:1">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </label>
                            <input type="file" id="est-foto-input-${e.estudiante_id}" accept="image/*" style="display:none"
                                onchange="actualizarFotoEstudiante('${e.estudiante_id}', this)">
                        </div>
                        ${e.nombre}
                    </div></td>
                    <td>${e.estudiante_id}</td>
                    <td>${e.curso_nombre || e.curso_id || '—'}</td>
                    <td>${e.documento || '—'}</td>
                    <td><span class="badge badge-${e.estado_est === 'R' ? 'danger' : 'success'}">${e.estado_est === 'R' ? 'Retirado' : e.estado_est === 'T' ? 'Trasladado' : 'Matriculado'}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarEstudiante('${e.estudiante_id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarEstudiante('${e.estudiante_id}','${(e.nombre || '').replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');

        }
        var _fotoEstudianteId = null;
        var _fotoBase64       = null;
        var _fotoNombre       = null;

        function actualizarFotoEstudiante(estudianteId, inputEl) {
            const file = inputEl.files[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) { alert('La imagen debe ser menor a 10 MB.'); inputEl.value = ''; return; }

            const reader = new FileReader();
            reader.onload = function(ev) {
                // Comprimir a 150x150 JPEG ~85% con canvas
                const tmpImg = new Image();
                tmpImg.onload = function() {
                    const MAX = 150;
                    let w = tmpImg.width, h = tmpImg.height;
                    if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
                    else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
                    const cv = document.createElement('canvas');
                    cv.width = w; cv.height = h;
                    cv.getContext('2d').drawImage(tmpImg, 0, 0, w, h);
                    _fotoBase64       = cv.toDataURL('image/jpeg', 0.85);
                    _fotoEstudianteId = estudianteId;
                    // Obtener nombre del estudiante
                    const row = document.getElementById('est-row-' + estudianteId);
                    _fotoNombre = row ? (row.querySelector('td > div > div:last-child') || row.querySelector('td > div'))?.textContent?.trim().split('\n')[0] || estudianteId : estudianteId;
                    // Mostrar modal de preview
                    document.getElementById('fotoPreviewImg').src = _fotoBase64;
                    document.getElementById('fotoPreviewNombre').textContent = _fotoNombre;
                    document.getElementById('modalFotoEstudiante').classList.add('show');
                };
                tmpImg.src = ev.target.result;
                inputEl.value = '';
            };
            reader.readAsDataURL(file);
        }

        function cerrarModalFoto() {
            document.getElementById('modalFotoEstudiante').classList.remove('show');
            _fotoBase64 = null; _fotoEstudianteId = null;
        }

        async function confirmarGuardarFoto() {
            if (!_fotoBase64 || !_fotoEstudianteId) return;
            const btn = document.getElementById('btnGuardarFoto');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            // Guardar referencia antes del finally
            const savedFoto = _fotoBase64;
            const savedId   = _fotoEstudianteId;
            try {
                const res = await fetch(`${API}/estudiantes/${savedId}/foto`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ foto: savedFoto })
                });
                if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error al guardar'); }
                // Actualizar avatar en la fila inmediatamente
                const imgEl = document.getElementById('est-avatar-' + savedId);
                const iniEl = document.getElementById('est-ini-'    + savedId);
                if (imgEl) { imgEl.src = savedFoto; imgEl.style.cssText += ';display:block'; }
                if (iniEl) { iniEl.style.display = 'none'; }
                document.getElementById('modalFotoEstudiante').classList.remove('show');
            } catch(e) {
                alert('No se pudo guardar la foto: ' + e.message);
            } finally {
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar Foto';
                _fotoBase64 = null; _fotoEstudianteId = null;
            }
        }

















        // =========================================================
        // 📝 CRUD ESTUDIANTES
        // =========================================================
        const estFields = ['est_codigo', 'est_nombre', 'est_tipo_documento', 'est_documento', 'est_lugar_expedicion', 'est_lugar_nacimiento', 'est_pais', 'est_f_nacimiento', 'est_sexo', 'est_grupo_sangre', 'est_peso', 'est_estatura', 'est_eps', 'est_sisben', 'est_niv_sisben', 'est_alergias', 'est_religion', 'est_poliza', 'est_dni', 'est_vigencia_i', 'est_vigencia_f', 'est_ano_lectivo', 'est_jornada', 'est_transporte', 'est_curso_ingles', 'est_asopadres', 'est_seguro', 'est_historia', 'est_curso_id', 'est_estado_est', 'est_estado_aca', 'est_direccion', 'est_estrato', 'est_telefono', 'est_correo', 'est_usuario', 'est_clave', 'est_estado_civil', 'est_hermanos', 'est_vive', 'est_vive_otro', 'est_nombre_padre', 'est_id_padre', 'est_exp_padre', 'est_dir_padre', 'est_tel_padre', 'est_correo_padre', 'est_formacion_padre', 'est_empresa_padre', 'est_cargo_padre', 'est_dir_emp_padre', 'est_tel_emp_padre', 'est_nombre_madre', 'est_id_madre', 'est_exp_madre', 'est_dir_madre', 'est_tel_madre', 'est_correo_madre', 'est_formacion_madre', 'est_empresa_madre', 'est_cargo_madre', 'est_dir_emp_madre', 'est_tel_emp_madre', 'est_otro_acud', 'est_nombre_asistente', 'est_id_acud', 'est_dir_acud', 'est_tel_acud', 'est_correo_acud', 'est_formacion_acud', 'est_empresa_acud', 'est_cargo_acud'];

        // Mapa de campo HTML id → campo DB
        const estFieldMap = {
            est_codigo: 'estudiante_id', est_nombre: 'nombre', est_tipo_documento: 'tipo_documento', est_documento: 'documento',
            est_lugar_expedicion: 'lugar_expedicion', est_lugar_nacimiento: 'lugar_nacimiento', est_pais: 'pais',
            est_f_nacimiento: 'f_nacimiento', est_sexo: 'sexo', est_grupo_sangre: 'grupo_sangre', est_peso: 'peso',
            est_estatura: 'estatura', est_eps: 'eps', est_sisben: 'sisben', est_niv_sisben: 'niv_sisben',
            est_alergias: 'alergias', est_religion: 'religion', est_poliza: 'poliza', est_dni: 'dni',
            est_vigencia_i: 'vigencia_i', est_vigencia_f: 'vigencia_f', est_ano_lectivo: 'ano_lectivo',
            est_jornada: 'jornada', est_transporte: 'transporte', est_curso_ingles: 'curso_ingles',
            est_asopadres: 'asopadres', est_seguro: 'seguro', est_historia: 'historia', est_curso_id: 'curso_id',
            est_estado_est: 'estado_est', est_estado_aca: 'estado_aca', est_direccion: 'direccion', est_estrato: 'estrato',
            est_telefono: 'telefono', est_correo: 'correo', est_usuario: 'usuario', est_clave: 'clave',
            est_estado_civil: 'estado_civil', est_hermanos: 'hermanos', est_vive: 'vive', est_vive_otro: 'vive_otro',
            est_nombre_padre: 'nombre_padre', est_id_padre: 'id_padre', est_exp_padre: 'exp_padre',
            est_dir_padre: 'dir_padre', est_tel_padre: 'tel_padre', est_correo_padre: 'correo_padre',
            est_formacion_padre: 'formacion_padre', est_empresa_padre: 'empresa_padre', est_cargo_padre: 'cargo_padre',
            est_dir_emp_padre: 'dir_emp_padre', est_tel_emp_padre: 'tel_emp_padre',
            est_nombre_madre: 'nombre_madre', est_id_madre: 'id_madre', est_exp_madre: 'exp_madre',
            est_dir_madre: 'dir_madre', est_tel_madre: 'tel_madre', est_correo_madre: 'correo_madre',
            est_formacion_madre: 'formacion_madre', est_empresa_madre: 'empresa_madre', est_cargo_madre: 'cargo_madre',
            est_dir_emp_madre: 'dir_emp_madre', est_tel_emp_madre: 'tel_emp_madre',
            est_otro_acud: 'otro_acud', est_nombre_asistente: 'nombre_asistente', est_id_acud: 'id_acud',
            est_dir_acud: 'dir_acud', est_tel_acud: 'tel_acud', est_correo_acud: 'correo_acud',
            est_formacion_acud: 'formacion_acud', est_empresa_acud: 'empresa_acud', est_cargo_acud: 'cargo_acud'
        };

        async function cargarCursosSelect() {
            try {
                const res = await fetch(`${API}/cursos`);
                const cursos = await res.json();
                const sel = document.getElementById('est_curso_id');
                sel.innerHTML = '<option value="">Seleccione Curso</option>' +
                    cursos.map(c => `<option value="${c.curso_id}">${c.codigo} - ${c.nombre || c.codigo}</option>`).join('');
            } catch (e) { console.error('Error cargando cursos:', e); }
        }

        function abrirNuevoEstudiante() {
            document.getElementById('estEditId').value = '';
            document.getElementById('modalEstudianteTitulo').innerHTML = '<i class="fas fa-user-graduate" style="color:var(--primary)"></i> Nuevo Estudiante';
            estFields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('est_pais').value = 'COLOMBIA';
            document.getElementById('est_ano_lectivo').value = '2026';
            cargarCursosSelect();
            document.getElementById('modalEstudiante').classList.add('show');
        }

        async function editarEstudiante(id) {
            try {
                const res = await fetch(`${API}/estudiantes/${id}`);
                const est = await res.json();
                document.getElementById('estEditId').value = id;
                document.getElementById('modalEstudianteTitulo').innerHTML = '<i class="fas fa-edit" style="color:var(--primary)"></i> Editar Estudiante';
                document.getElementById('est_codigo').value = est.estudiante_id || '';
                document.getElementById('est_codigo').readOnly = true;

                await cargarCursosSelect();

                // Llenar todos los campos
                for (const [htmlId, dbField] of Object.entries(estFieldMap)) {
                    if (htmlId === 'est_codigo') continue;
                    const el = document.getElementById(htmlId);
                    if (el && est[dbField] !== undefined && est[dbField] !== null) {
                        if (el.type === 'date' && est[dbField]) {
                            el.value = est[dbField].substring(0, 10);
                        } else {
                            el.value = est[dbField];
                        }
                    }
                }
                document.getElementById('modalEstudiante').classList.add('show');
            } catch (err) {
                alert('Error cargando estudiante: ' + err.message);
            }
        }

        function eliminarEstudiante(id, nombre) {
            document.getElementById('elimEstId').value = id;
            document.getElementById('elimEstNombre').textContent = nombre;
            document.getElementById('modalEliminarEstudiante').classList.add('show');
        }

        async function confirmarEliminarEstudiante() {
            const id = document.getElementById('elimEstId').value;
            try {
                const res = await fetch(`${API}/estudiantes/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalEliminarEstudiante').classList.remove('show');
                    loaded['estudiantes'] = false;
                    await cargarEstudiantes();
                    loaded['estudiantes'] = true;
                    loaded['dashboard'] = false;
                    cargarDatosSeccion('dashboard');
                } else {
                    alert('Error: ' + (data.error || 'No se pudo eliminar'));
                }
            } catch (err) {
                alert('Error eliminando: ' + err.message);
            }
        }

        async function guardarEstudiante() {
            const codigo = document.getElementById('est_codigo').value.trim();
            const nombre = document.getElementById('est_nombre').value.trim();
            if (!codigo || !nombre) {
                alert('Código y Nombre son obligatorios');
                return;
            }

            // Construir objeto con todos los campos
            const body = {};
            for (const [htmlId, dbField] of Object.entries(estFieldMap)) {
                const el = document.getElementById(htmlId);
                if (el && el.value.trim()) body[dbField] = el.value.trim();
            }

            const editId = document.getElementById('estEditId').value;
            const isEdit = !!editId;

            try {
                const res = await fetch(`${API}/estudiantes${isEdit ? '/' + editId : ''}`, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    cerrarModalEstudiante();
                    loaded['estudiantes'] = false;
                    await cargarEstudiantes();
                    loaded['estudiantes'] = true;
                    loaded['dashboard'] = false;
                    cargarDatosSeccion('dashboard');
                } else {
                    alert('Error: ' + (data.error || 'No se pudo guardar'));
                }
            } catch (err) {
                alert('Error guardando: ' + err.message);
            }
        }

        function cerrarModalEstudiante() {
            document.getElementById('modalEstudiante').classList.remove('show');
            document.getElementById('est_codigo').readOnly = false;
        }

        // ── CARGAR DASHBOARD AL INICIO ──
        cargarDatosSeccion('dashboard');

        // ── ACUDIENTES ──
        async function cargarAcudientes() {
            const res = await fetch(`${API}/acudientes?limit=200`);
            const data = await res.json();
            const sec = document.getElementById('secAcudientes');
            const tbody = sec.querySelector('tbody');
            tbody.innerHTML = data.acudientes.map((a, i) => `
                <tr>
                    <td>${a.nombre_asistente || '—'}</td>
                    <td>${a.id_acud || a.Id || '—'}</td>
                    <td>${a.tel_acud || '—'}</td>
                    <td>${a.correo_acud || '—'}</td>
                    <td>${a.formacion_acud || '—'}</td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarAcudiente('${a._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarAcudiente('${a._id}','${(a.nombre_asistente || '').replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // =========================================================
        // 📝 CRUD ACUDIENTES
        // =========================================================
        const acudFieldMap = {
            acud_nombre: 'nombre_asistente', acud_identi: 'id_acud', acud_expedicion: 'expedicion_acud',
            acud_direccion: 'dir_acud', acud_telefono: 'tel_acud', acud_correo: 'correo_acud',
            acud_formacion: 'formacion_acud', acud_empresa: 'empresa_acud', acud_cargo: 'cargo_acud',
            acud_dir_laboral: 'dir_laboral_acud', acud_tel_laboral: 'tel_laboral_acud',
            acud_usuario: 'usuario_acud', acud_clave: 'clave_acud'
        };

        function abrirNuevoAcudiente() {
            document.getElementById('acudEditId').value = '';
            document.getElementById('modalAcudienteTitulo').innerHTML = '<i class="fas fa-user-shield" style="color:var(--primary)"></i> Nuevo Acudiente';
            Object.keys(acudFieldMap).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('modalAcudiente').classList.add('show');
        }

        async function editarAcudiente(id) {
            try {
                const res = await fetch(`${API}/acudientes/${id}`);
                const acud = await res.json();
                document.getElementById('acudEditId').value = id;
                document.getElementById('modalAcudienteTitulo').innerHTML = '<i class="fas fa-edit" style="color:var(--primary)"></i> Editar Acudiente';
                for (const [htmlId, dbField] of Object.entries(acudFieldMap)) {
                    const el = document.getElementById(htmlId);
                    if (el && acud[dbField] !== undefined && acud[dbField] !== null) el.value = acud[dbField];
                }
                document.getElementById('modalAcudiente').classList.add('show');
            } catch (err) { alert('Error cargando acudiente: ' + err.message); }
        }

        function eliminarAcudiente(id, nombre) {
            document.getElementById('elimAcudId').value = id;
            document.getElementById('elimAcudNombre').textContent = nombre;
            document.getElementById('modalEliminarAcudiente').classList.add('show');
        }

        async function confirmarEliminarAcudiente() {
            const id = document.getElementById('elimAcudId').value;
            try {
                const res = await fetch(`${API}/acudientes/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalEliminarAcudiente').classList.remove('show');
                    loaded['acudientes'] = false; await cargarAcudientes(); loaded['acudientes'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo eliminar')); }
            } catch (err) { alert('Error eliminando: ' + err.message); }
        }

        async function guardarAcudiente() {
            const nombre = document.getElementById('acud_nombre').value.trim();
            if (!nombre) { alert('Nombre del acudiente es obligatorio'); return; }
            const body = {};
            for (const [htmlId, dbField] of Object.entries(acudFieldMap)) {
                const el = document.getElementById(htmlId);
                if (el && el.value.trim()) body[dbField] = el.value.trim();
            }
            const editId = document.getElementById('acudEditId').value;
            const isEdit = !!editId;
            try {
                const res = await fetch(`${API}/acudientes${isEdit ? '/' + editId : ''}`, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalAcudiente').classList.remove('show');
                    loaded['acudientes'] = false; await cargarAcudientes(); loaded['acudientes'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo guardar')); }
            } catch (err) { alert('Error guardando: ' + err.message); }
        }

        // ── ASIGNATURAS ──
        async function cargarAsignaturas() {
            const res = await fetch(`${API}/asignaturas`);
            const asignaturas = await res.json();
            const sec = document.getElementById('secAsignaturas');
            const tbody = sec.querySelector('tbody');
            tbody.innerHTML = asignaturas.map(a => `
                <tr>
                    <td>${a.subject_id}</td>
                    <td><strong>${a.nombre}</strong></td>
                    <td>${a.codigo}</td>
                    <td>${a.sigla || '—'}</td>

                    <td><span class="badge badge-${a.estado === 'A' ? 'success' : 'danger'}">${a.estado === 'A' ? 'Activa' : 'Inactiva'}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarAsignatura('${a.subject_id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarAsignatura('${a.subject_id}','${(a.nombre || '').replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // =========================================================
        // 📝 CRUD ASIGNATURAS
        // =========================================================
        const asigFieldMap = { asig_nombre: 'nombre', asig_codigo: 'codigo', asig_sigla: 'sigla', asig_estado: 'estado' };

        function abrirNuevaAsignatura() {
            document.getElementById('asigEditId').value = '';
            document.getElementById('modalAsigTitulo').innerHTML = '<i class="fas fa-book" style="color:var(--primary)"></i> Nueva Asignatura';
            Object.keys(asigFieldMap).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('asig_estado').value = 'A';

            document.getElementById('asig_estado_group').style.display = 'none';
            document.getElementById('modalAsignatura').classList.add('show');
        }

        async function editarAsignatura(id) {
            try {
                const res = await fetch(`${API}/asignaturas/${id}`);
                const asig = await res.json();
                document.getElementById('asigEditId').value = id;
                document.getElementById('modalAsigTitulo').innerHTML = '<i class="fas fa-edit" style="color:var(--primary)"></i> Editar Asignatura';

                document.getElementById('asig_estado_group').style.display = '';
                for (const [htmlId, dbField] of Object.entries(asigFieldMap)) {
                    const el = document.getElementById(htmlId);
                    if (el && asig[dbField] !== undefined) el.value = asig[dbField];
                }
                document.getElementById('modalAsignatura').classList.add('show');
            } catch (err) { alert('Error: ' + err.message); }
        }

        function eliminarAsignatura(id, nombre) {
            document.getElementById('elimAsigId').value = id;
            document.getElementById('elimAsigNombre').textContent = nombre;
            document.getElementById('modalEliminarAsignatura').classList.add('show');
        }

        async function confirmarEliminarAsignatura() {
            const id = document.getElementById('elimAsigId').value;
            try {
                const res = await fetch(`${API}/asignaturas/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalEliminarAsignatura').classList.remove('show');
                    loaded['asignaturas'] = false; await cargarAsignaturas(); loaded['asignaturas'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo eliminar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        async function guardarAsignatura() {
            const nombre = document.getElementById('asig_nombre').value.trim();
            const codigo = document.getElementById('asig_codigo').value.trim();
            if (!nombre || !codigo) { alert('Nombre y Código son obligatorios'); return; }
            const body = {};
            for (const [htmlId, dbField] of Object.entries(asigFieldMap)) {
                const el = document.getElementById(htmlId);
                if (el && el.value.trim()) body[dbField] = el.value.trim();
            }
            const editId = document.getElementById('asigEditId').value;
            const isEdit = !!editId;
            try {
                const res = await fetch(`${API}/asignaturas${isEdit ? '/' + editId : ''}`, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalAsignatura').classList.remove('show');
                    loaded['asignaturas'] = false; await cargarAsignaturas(); loaded['asignaturas'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo guardar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        // ── CURSOS ──
        async function cargarCursos() {
            const res = await fetch(`${API}/cursos`);
            const cursos = await res.json();
            const sec = document.getElementById('secCursos');
            const tbody = sec.querySelector('tbody');
            tbody.innerHTML = cursos.map(c => `
                <tr>
                    <td>${c.curso_id}</td>
                    <td><strong>${c.nombre || c.codigo}</strong></td>
                    <td>${c.codigo}</td>
                    <td>${c.docente_nombre}</td>
                    <td><span class="badge badge-${c.estado === 'A' ? 'success' : 'danger'}">${c.estado === 'A' ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarCurso('${c.curso_id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarCurso('${c.curso_id}','${(c.nombre || c.codigo || '').replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // =========================================================
        // 📝 CRUD CURSOS
        // =========================================================
        const cursoFieldMap = { curso_codigo: 'codigo', curso_nombre: 'nombre', curso_id_docente: 'id_docente', curso_estado: 'estado' };

        async function cargarDocentesSelect() {
            try {
                const res = await fetch(`${API}/docentes`);
                const docentes = await res.json();
                const sel = document.getElementById('curso_id_docente');
                sel.innerHTML = '<option value="">Seleccione Docente</option>' +
                    docentes.map(d => `<option value="${d.teacher_id}">${d.nombre}</option>`).join('');
            } catch (e) { console.error('Error cargando docentes:', e); }
        }

        function abrirNuevoCurso() {
            document.getElementById('cursoEditId').value = '';
            document.getElementById('modalCursoTitulo').innerHTML = '<i class="fas fa-book-open" style="color:var(--primary)"></i> Nuevo Curso';
            Object.keys(cursoFieldMap).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('curso_estado').value = 'A';
            document.getElementById('curso_estado_group').style.display = 'none';
            cargarDocentesSelect();
            document.getElementById('modalCurso').classList.add('show');
        }

        async function editarCurso(id) {
            try {
                const res = await fetch(`${API}/cursos/${id}`);
                const curso = await res.json();
                document.getElementById('cursoEditId').value = id;
                document.getElementById('modalCursoTitulo').innerHTML = '<i class="fas fa-edit" style="color:var(--primary)"></i> Editar Curso';
                document.getElementById('curso_estado_group').style.display = '';
                await cargarDocentesSelect();
                for (const [htmlId, dbField] of Object.entries(cursoFieldMap)) {
                    const el = document.getElementById(htmlId);
                    if (el && curso[dbField] !== undefined) el.value = curso[dbField];
                }
                document.getElementById('modalCurso').classList.add('show');
            } catch (err) { alert('Error: ' + err.message); }
        }

        function eliminarCurso(id, nombre) {
            document.getElementById('elimCursoId').value = id;
            document.getElementById('elimCursoNombre').textContent = nombre;
            document.getElementById('modalEliminarCurso').classList.add('show');
        }

        async function confirmarEliminarCurso() {
            const id = document.getElementById('elimCursoId').value;
            try {
                const res = await fetch(`${API}/cursos/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalEliminarCurso').classList.remove('show');
                    loaded['cursos'] = false; await cargarCursos(); loaded['cursos'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo eliminar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        async function guardarCurso() {
            const codigo = document.getElementById('curso_codigo').value.trim();
            const nombre = document.getElementById('curso_nombre').value.trim();
            if (!codigo || !nombre) { alert('Código y Nombre son obligatorios'); return; }
            const body = {};
            for (const [htmlId, dbField] of Object.entries(cursoFieldMap)) {
                const el = document.getElementById(htmlId);
                if (el && el.value.trim()) body[dbField] = el.value.trim();
            }
            const editId = document.getElementById('cursoEditId').value;
            const isEdit = !!editId;
            try {
                const res = await fetch(`${API}/cursos${isEdit ? '/' + editId : ''}`, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalCurso').classList.remove('show');
                    loaded['cursos'] = false; await cargarCursos(); loaded['cursos'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo guardar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        // ── PENSUM ──
        async function cargarPensum() {
            const res = await fetch(`${API}/pensum`);
            const pensums = await res.json();
            const sec = document.getElementById('secPensum');
            const tbody = sec.querySelector('tbody');
            tbody.innerHTML = pensums.map(p => `
                <tr>
                    <td>${p.subject_id}</td>
                    <td>${p.curso_codigo}</td>
                    <td>${p.asignatura_nombre}</td>
                    <td>${p.intensidad || '—'}</td>
                    <td>${p.docente_nombre}</td>
                    <td><span class="badge badge-${p.estado === 'A' ? 'success' : 'danger'}">${p.estado === 'A' ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarPensum('${p.subject_id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarPensum('${p.subject_id}','${(p.asignatura_nombre || '').replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // =========================================================
        // 📝 CRUD PENSUM
        // =========================================================
        const pensumFieldMap = { pensum_nombre: 'nombre', pensum_class_id: 'class_id', pensum_teacher_id: 'teacher_id', pensum_asignatura_id: 'asignatura_id', pensum_intensidad: 'intensidad', pensum_estado: 'estado' };

        async function cargarPensumSelects() {
            try {
                const [resCursos, resDocentes, resAsig] = await Promise.all([
                    fetch(`${API}/cursos`), fetch(`${API}/docentes`), fetch(`${API}/asignaturas`)
                ]);
                const cursos = await resCursos.json();
                const docentes = await resDocentes.json();
                const asignaturas = await resAsig.json();
                document.getElementById('pensum_class_id').innerHTML = '<option value="">Seleccione Curso</option>' + cursos.map(c => `<option value="${c.curso_id}">${c.codigo} - ${c.nombre || c.codigo}</option>`).join('');
                document.getElementById('pensum_teacher_id').innerHTML = '<option value="">Seleccione Docente</option>' + docentes.map(d => `<option value="${d.teacher_id}">${d.nombre}</option>`).join('');
                document.getElementById('pensum_asignatura_id').innerHTML = '<option value="">Seleccione Asignatura</option>' + asignaturas.map(a => `<option value="${a.subject_id}">${a.nombre}</option>`).join('');
            } catch (e) { console.error('Error cargando selects pensum:', e); }
        }

        function abrirNuevoPensum() {
            document.getElementById('pensumEditId').value = '';
            document.getElementById('modalPensumTitulo').innerHTML = '<i class="fas fa-sitemap" style="color:var(--primary)"></i> Crear Registro';
            Object.keys(pensumFieldMap).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('pensum_estado').value = 'A';
            document.getElementById('pensum_estado_group').style.display = 'none';
            cargarPensumSelects();
            document.getElementById('modalPensum').classList.add('show');
        }

        async function editarPensum(id) {
            try {
                const res = await fetch(`${API}/pensum/${id}`);
                const p = await res.json();
                document.getElementById('pensumEditId').value = id;
                document.getElementById('modalPensumTitulo').innerHTML = '<i class="fas fa-edit" style="color:var(--primary)"></i> Editar Pensum';
                document.getElementById('pensum_estado_group').style.display = '';
                await cargarPensumSelects();
                for (const [htmlId, dbField] of Object.entries(pensumFieldMap)) {
                    const el = document.getElementById(htmlId);
                    if (el && p[dbField] !== undefined) el.value = p[dbField];
                }
                document.getElementById('modalPensum').classList.add('show');
            } catch (err) { alert('Error: ' + err.message); }
        }

        function eliminarPensum(id, nombre) {
            document.getElementById('elimPensumId').value = id;
            document.getElementById('elimPensumNombre').textContent = nombre;
            document.getElementById('modalEliminarPensum').classList.add('show');
        }

        async function confirmarEliminarPensum() {
            const id = document.getElementById('elimPensumId').value;
            try {
                const res = await fetch(`${API}/pensum/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalEliminarPensum').classList.remove('show');
                    loaded['pensum'] = false; await cargarPensum(); loaded['pensum'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo eliminar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        async function guardarPensum() {
            const nombre = document.getElementById('pensum_nombre').value.trim();
            if (!nombre) { alert('Nombre es obligatorio'); return; }
            const body = {};
            for (const [htmlId, dbField] of Object.entries(pensumFieldMap)) {
                const el = document.getElementById(htmlId);
                if (el && el.value.trim()) body[dbField] = el.value.trim();
            }
            const editId = document.getElementById('pensumEditId').value;
            const isEdit = !!editId;
            try {
                const res = await fetch(`${API}/pensum${isEdit ? '/' + editId : ''}`, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalPensum').classList.remove('show');
                    loaded['pensum'] = false; await cargarPensum(); loaded['pensum'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo guardar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        // ── LOGROS ──
        let logroEditId = null;
        let logroDeleteId = null;

        async function cargarLogros() {
            const res = await fetch(`${API}/logros`);
            const logros = await res.json();
            const sec = document.getElementById('secLogros');
            const tbody = sec.querySelector('tbody');
            tbody.innerHTML = logros.map(l => `
                <tr>
                    <td>${l.Id || l._id.substring(0, 8)}</td>
                    <td>${l.asignatura || '—'}</td>
                    <td>${l.curso || '—'}</td>
                    <td>${l.descripcion || '—'}</td>
                    <td><span class="badge badge-${l.estado === 'A' ? 'success' : 'danger'}">${l.estado === 'A' ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarLogro('${l._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarLogro('${l._id}','${(l.descripcion || '').substring(0, 30).replace(/'/g, "\\\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function abrirNuevoLogro() {
            logroEditId = null;
            document.getElementById('modalLogroTitulo').innerHTML = '<i class="fas fa-trophy"></i> Nuevo Logro';
            document.getElementById('logroAsignatura').value = '';
            document.getElementById('logroCurso').value = '';
            document.getElementById('logroDescripcion').value = '';
            document.getElementById('logroEstadoGroup').style.display = 'none';
            document.getElementById('modalLogro').classList.add('show');
        }

        async function editarLogro(id) {
            const res = await fetch(`${API}/logros/${id}`);
            const logro = await res.json();
            logroEditId = id;
            document.getElementById('modalLogroTitulo').innerHTML = '<i class="fas fa-edit"></i> Editar Logro';
            document.getElementById('logroAsignatura').value = logro.asignatura || '';
            document.getElementById('logroCurso').value = logro.curso || '';
            document.getElementById('logroDescripcion').value = logro.descripcion || '';
            document.getElementById('logroEstado').value = logro.estado || 'A';
            document.getElementById('logroEstadoGroup').style.display = 'block';
            document.getElementById('modalLogro').classList.add('show');
        }

        async function guardarLogro() {
            const body = {
                asignatura: document.getElementById('logroAsignatura').value.trim(),
                curso: document.getElementById('logroCurso').value.trim(),
                descripcion: document.getElementById('logroDescripcion').value.trim()
            };
            if (!body.descripcion) { alert('La descripción es obligatoria'); return; }
            if (logroEditId) body.estado = document.getElementById('logroEstado').value;
            const url = logroEditId ? `${API}/logros/${logroEditId}` : `${API}/logros`;
            const method = logroEditId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                document.getElementById('modalLogro').classList.remove('show');
                await cargarLogros();
            } else { const err = await res.json(); alert('Error: ' + (err.error || 'No se pudo guardar')); }
        }

        function eliminarLogro(id, desc) {
            logroDeleteId = id;
            document.getElementById('elimLogroMsg').textContent = `¿Eliminar el logro "${desc}..."?`;
            document.getElementById('modalEliminarLogro').classList.add('show');
        }

        async function confirmarEliminarLogro() {
            const res = await fetch(`${API}/logros/${logroDeleteId}`, { method: 'DELETE' });
            if (res.ok) {
                document.getElementById('modalEliminarLogro').classList.remove('show');
                await cargarLogros();
            } else { alert('Error al eliminar'); }
        }

        // ── INDICADORES DE COMPORTAMIENTO ──
        async function cargarIndicadores() {
            const res = await fetch(`${API}/indicadores`);
            const indicadores = await res.json();
            const sec = document.getElementById('secIndicadores');
            const tbody = sec.querySelector('tbody');
            tbody.innerHTML = indicadores.map(ind => `
                <tr>
                    <td>${ind.tipo || '—'}</td>
                    <td>${ind.descripcion || '—'}</td>
                    <td><span class="badge badge-${ind.estado === 'A' ? 'success' : 'danger'}">${ind.estado === 'A' ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarIndicador('${ind._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarIndicador('${ind._id}','${(ind.tipo || '').replace(/'/g, "\\\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // =========================================================
        // 📝 CRUD INDICADORES
        // =========================================================
        const indFieldMap = { ind_tipo: 'tipo', ind_descripcion: 'descripcion', ind_estado: 'estado' };

        function abrirNuevoIndicador() {
            document.getElementById('indEditId').value = '';
            document.getElementById('modalIndicadorTitulo').innerHTML = '<i class="fas fa-chart-line" style="color:var(--primary)"></i> Nuevo Indicador';
            Object.keys(indFieldMap).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('ind_estado').value = 'A';
            document.getElementById('ind_estado_group').style.display = 'none';
            document.getElementById('modalIndicador').classList.add('show');
        }

        async function editarIndicador(id) {
            try {
                const res = await fetch(`${API}/indicadores/${id}`);
                const ind = await res.json();
                document.getElementById('indEditId').value = id;
                document.getElementById('modalIndicadorTitulo').innerHTML = '<i class="fas fa-edit" style="color:var(--primary)"></i> Editar Indicador';
                document.getElementById('ind_estado_group').style.display = '';
                for (const [htmlId, dbField] of Object.entries(indFieldMap)) {
                    const el = document.getElementById(htmlId);
                    if (el && ind[dbField] !== undefined) el.value = ind[dbField];
                }
                document.getElementById('modalIndicador').classList.add('show');
            } catch (err) { alert('Error: ' + err.message); }
        }

        function eliminarIndicador(id, nombre) {
            document.getElementById('elimIndId').value = id;
            document.getElementById('elimIndNombre').textContent = nombre;
            document.getElementById('modalEliminarIndicador').classList.add('show');
        }

        async function confirmarEliminarIndicador() {
            const id = document.getElementById('elimIndId').value;
            try {
                const res = await fetch(`${API}/indicadores/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalEliminarIndicador').classList.remove('show');
                    loaded['indicadores'] = false; await cargarIndicadores(); loaded['indicadores'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo eliminar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        async function guardarIndicador() {
            const tipo = document.getElementById('ind_tipo').value.trim();
            const desc = document.getElementById('ind_descripcion').value.trim();
            if (!tipo || !desc) { alert('Tipo y Descripción son obligatorios'); return; }
            const body = {};
            for (const [htmlId, dbField] of Object.entries(indFieldMap)) {
                const el = document.getElementById(htmlId);
                if (el && el.value.trim()) body[dbField] = el.value.trim();
            }
            const editId = document.getElementById('indEditId').value;
            const isEdit = !!editId;
            try {
                const res = await fetch(`${API}/indicadores${isEdit ? '/' + editId : ''}`, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('modalIndicador').classList.remove('show');
                    loaded['indicadores'] = false; await cargarIndicadores(); loaded['indicadores'] = true;
                } else { alert('Error: ' + (data.error || 'No se pudo guardar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        // ── CALIFICACIONES (PLANILLA) ──
        let estudiantesCache = {};
        let pensumCache = [];
        let planillaCache = [];
        let calPensumActual = '';
        let calPeriodoActual = '';
        let calDocenteActual = '';

        async function cargarCalificaciones() {
            // 1. Cargar planillas (periodos) desde la tabla planilla
            try {
                const resPlan = await fetch(`${API}/planillas?estado=A`);
                planillaCache = await resPlan.json();
                const selPer = document.getElementById('calSelectPeriodo');
                if (selPer.options.length <= 1) {
                    planillaCache.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.Id || p._id;
                        opt.textContent = `P${p.periodo} - ${p.anno}`;
                        selPer.appendChild(opt);
                    });
                }
            } catch (e) { console.error('Error cargando planillas:', e); }

            // 2. Cargar docentes
            try {
                const resDoc = await fetch(`${API}/docentes`);
                const docentes = await resDoc.json();
                const selDoc = document.getElementById('calSelectDocente');
                if (selDoc.options.length <= 1) {
                    docentes.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d.teacher_id || d._id;
                        opt.textContent = d.nombre || '—';
                        selDoc.appendChild(opt);
                    });
                    selDoc.onchange = filtrarPensumPorDocente;
                }
            } catch (e) { }

            // 3. Cargar pensum completo en cache  
            try {
                const resPen = await fetch(`${API}/pensum`);
                pensumCache = await resPen.json();
                renderPensumSelect(pensumCache);
            } catch (e) { }

            // 4. Precargar estudiantes para lookup
            if (Object.keys(estudiantesCache).length === 0) {
                try {
                    const resEst = await fetch(`${API}/estudiantes?limit=500`);
                    const dataEst = await resEst.json();
                    (dataEst.estudiantes || dataEst).forEach(e => {
                        estudiantesCache[e.student_id || e.estudiante_id] = e.nombre || 'Estudiante';
                    });
                } catch (e) { }
            }
        }

        function renderPensumSelect(lista) {
            const selPen = document.getElementById('calSelectPensum');
            selPen.innerHTML = '<option value="">Seleccione Asignatura (Pensum)</option>';
            lista.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.subject_id || p._id;
                opt.textContent = `${p.asignatura_nombre || p.asignatura || p.nombre || 'Asignatura'} - ${p.curso_codigo || ''} (${p.docente_nombre || ''})`;
                selPen.appendChild(opt);
            });
        }

        function filtrarPensumPorDocente() {
            const docenteId = document.getElementById('calSelectDocente').value;
            // Reset pensum y barra de notas al cambiar de docente
            document.getElementById('calSelectPensum').value = '';
            document.getElementById('calNotaBar').style.display = 'none';
            document.getElementById('calInfoBar').style.display = 'none';
            document.getElementById('planillaTbody').innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400)">Seleccione una asignatura y periodo para ver calificaciones</td></tr>';

            if (!docenteId) {
                renderPensumSelect(pensumCache);
            } else {
                // Usar String() para comparar independiente del tipo numerico/string en MongoDB
                const filtrado = pensumCache.filter(p => String(p.teacher_id) === String(docenteId));
                renderPensumSelect(filtrado);
            }
        }

        function cambiarCalTab(tab) {
            document.querySelectorAll('.calTabBtn').forEach(b => {
                b.classList.remove('active');
                b.style.opacity = '0.6';
                b.style.background = '';
            });
            const activeBtn = document.querySelector(`.calTabBtn[data-caltab="${tab}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.style.opacity = '1';
                activeBtn.style.background = 'var(--white)';
            }
            document.getElementById('calTabPlanilla').style.display = tab === 'planilla' ? '' : 'none';
            document.getElementById('calTabDetalle').style.display = tab === 'detalle' ? '' : 'none';
        }

        // Buscar: carga notas disponibles y muestra directamente la planilla_detalle con calificaciones reales
        async function buscarPlanilla() {
            const periodo = document.getElementById('calSelectPeriodo').value;
            const pensum = document.getElementById('calSelectPensum').value;
            const docente = document.getElementById('calSelectDocente').value;
            const tbody = document.getElementById('planillaTbody');

            if (!periodo) { alert('Seleccione un Periodo'); return; }
            if (!pensum) { alert('Seleccione una Asignatura (Pensum)'); return; }

            calPensumActual = pensum;
            calPeriodoActual = periodo;
            calDocenteActual = docente;

            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400)"><i class="fas fa-spinner fa-spin"></i> Buscando...</td></tr>';

            // Cargar id_notas para este pensum+periodo
            try {
                const resNotas = await fetch(`${API}/id-notas?pensum=${pensum}&per_id=${periodo}`);
                const idNotas = await resNotas.json();
                const selNota = document.getElementById('calSelectNota');
                selNota.innerHTML = '<option value="">Seleccione una nota...</option>';
                idNotas.forEach((n, i) => {
                    const opt = document.createElement('option');
                    opt.value = n.Id || n._id;
                    opt.textContent = `Registro ${n.registro || (i + 1)} - ${n.concepto || n.codigo || ''}`;
                    selNota.appendChild(opt);
                });
                // Agregar onchange al selector
                selNota.onchange = () => cargarNotaEnTabla(selNota.value);
                document.getElementById('calNotaBar').style.display = 'flex';

                // Auto-seleccionar la primera nota y cargar datos
                if (idNotas.length > 0) {
                    selNota.value = idNotas[0].Id || idNotas[0]._id;
                    await cargarNotaEnTabla(selNota.value);
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400)">No hay notas registradas para esta asignatura en este periodo</td></tr>';
                }
            } catch (e) {
                console.error('Error cargando id_notas:', e);
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--danger)">Error: ${e.message}</td></tr>`;
            }

            // Mostrar info
            const pensumInfo = pensumCache.find(p => (p.subject_id || p._id) == pensum);
            const planInfo = planillaCache.find(p => (p.Id || p._id) == periodo);
            const infoBar = document.getElementById('calInfoBar');
            infoBar.style.display = '';
            document.getElementById('calInfoTexto').innerHTML = `
                <strong>Periodo:</strong> ${planInfo ? `P${planInfo.periodo} - ${planInfo.anno}` : periodo} &nbsp;|&nbsp;
                <strong>Asignatura:</strong> ${pensumInfo ? (pensumInfo.asignatura_nombre || pensumInfo.nombre || 'N/A') : 'N/A'} &nbsp;|&nbsp;
                <strong>Curso:</strong> ${pensumInfo ? (pensumInfo.curso_codigo || '') : ''}
            `;
        }

        // Cargar una nota específica en la tabla (planilla_detalle)
        async function cargarNotaEnTabla(notaId) {
            if (!notaId) return;
            const tbody = document.getElementById('planillaTbody');
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin"></i> Cargando calificaciones...</td></tr>';

            try {
                const res = await fetch(`${API}/calificaciones/detalle?pensum=${calPensumActual}&periodo=${calPeriodoActual}&limit=500`);
                const data = await res.json();
                let notas = data.notas || [];
                // Filtrar por id_nota seleccionada
                notas = notas.filter(n => String(n.id_nota) === String(notaId));

                if (notas.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400)">No hay calificaciones registradas para esta nota</td></tr>';
                    return;
                }

                // Resolver nombres faltantes en lote
                const faltantes = [...new Set(notas.map(n => n.codigo_est).filter(c => !estudiantesCache[c]))];
                if (faltantes.length > 0) {
                    try {
                        const resNombres = await fetch(`${API}/estudiantes/nombres`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ codigos: faltantes })
                        });
                        const nombres = await resNombres.json();
                        Object.assign(estudiantesCache, nombres);
                    } catch (e) { console.warn('No se pudieron resolver nombres:', e); }
                }

                // Tabla editable con las calificaciones reales
                tbody.innerHTML = notas.map((n, idx) => {
                    const nombre = estudiantesCache[n.codigo_est] || n.codigo_est;
                    const c1 = parseInt(n.comp_1) || 0;
                    const c2 = parseInt(n.comp_2) || 0;
                    const c3 = parseInt(n.comp_3) || 0;
                    const nota = parseInt(n.nota) || 0;
                    const notaClass = nota >= 95 ? 'badge-success' : nota >= 80 ? 'badge-info' : nota >= 70 ? 'badge-warning' : nota > 0 ? 'badge-danger' : 'badge-violet';

                    return `
                    <tr data-detid="${n._id}">
                        <td style="font-weight:600;color:var(--primary)">${n.codigo_est}</td>
                        <td>
                            <div style="display:flex;align-items:center;gap:8px">
                                <div class="user-item-avatar" style="width:30px;height:30px;font-size:0.7rem;background:${getAvatarColor(idx % 8)}">${getInitials(nombre)}</div>
                                ${nombre}
                            </div>
                        </td>
                        <td style="font-size:0.8rem;color:var(--gray-600);max-width:250px;white-space:normal">${n.concepto || '—'}</td>
                        <td style="text-align:center"><input type="number" class="form-input calInput" style="width:60px;text-align:center;padding:4px;font-size:0.85rem" value="${c1}" data-field="comp_1" min="0" max="100" onchange="recalcDetProm(this)"></td>
                        <td style="text-align:center"><input type="number" class="form-input calInput" style="width:60px;text-align:center;padding:4px;font-size:0.85rem" value="${c2}" data-field="comp_2" min="0" max="100" onchange="recalcDetProm(this)"></td>
                        <td style="text-align:center"><input type="number" class="form-input calInput" style="width:60px;text-align:center;padding:4px;font-size:0.85rem" value="${c3}" data-field="comp_3" min="0" max="100" onchange="recalcDetProm(this)"></td>
                        <td style="text-align:center"><span class="badge ${notaClass} detProm">${nota}</span></td>
                        <td style="text-align:center">
                            <button class="btn btn-sm" style="background:var(--primary);color:#fff;border:none;font-size:0.75rem;padding:4px 8px" onclick="guardarDetalleFila('${n._id}')" title="Guardar"><i class="fas fa-save"></i></button>
                        </td>
                    </tr>`;
                }).join('');
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--danger)">Error: ${err.message}</td></tr>`;
            }
        }

        // Alias para el botón Editar
        function editarNotaSeleccionada() {
            const notaId = document.getElementById('calSelectNota').value;
            if (!notaId) { alert('Seleccione una nota'); return; }
            cargarNotaEnTabla(notaId);
        }

        function recalcDetProm(input) {
            const tr = input.closest('tr');
            const inputs = tr.querySelectorAll('.calInput');
            const vals = [];
            inputs.forEach(inp => { const v = parseFloat(inp.value) || 0; if (v > 0) vals.push(v); });
            const prom = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
            const badge = tr.querySelector('.detProm');
            badge.textContent = prom;
            badge.className = 'badge detProm ' + (prom >= 95 ? 'badge-success' : prom >= 80 ? 'badge-info' : prom >= 70 ? 'badge-warning' : prom > 0 ? 'badge-danger' : 'badge-violet');
        }

        async function guardarDetalleFila(id) {
            const tr = document.querySelector(`tr[data-detid="${id}"]`);
            const c1 = tr.querySelector('[data-field="comp_1"]').value;
            const c2 = tr.querySelector('[data-field="comp_2"]').value;
            const c3 = tr.querySelector('[data-field="comp_3"]').value;
            const nota = Math.round(([c1, c2, c3].map(Number).filter(v => v > 0).reduce((a, b) => a + b, 0)) / Math.max([c1, c2, c3].map(Number).filter(v => v > 0).length, 1));
            try {
                const res = await fetch(`${API}/calificaciones/detalle/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comp_1: c1, comp_2: c2, comp_3: c3, nota: nota })
                });
                if (res.ok) {
                    const btn = tr.querySelector('.fa-save').parentElement;
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    btn.style.background = '#10b981';
                    setTimeout(() => { btn.innerHTML = '<i class="fas fa-save"></i>'; btn.style.background = 'var(--primary)'; }, 1500);
                } else { alert('Error guardando'); }
            } catch (e) { alert('Error: ' + e.message); }
        }

        function toggleNuevaNota() {
            const panel = document.getElementById('calNuevaNota');
            panel.style.display = panel.style.display === 'none' ? '' : 'none';
        }

        async function crearNuevaNota() {
            const tipo = document.getElementById('calNuevoTipoNota').value;
            const concepto = document.getElementById('calNuevoConcepto').value.trim();
            if (!tipo) { alert('Seleccione tipo de nota'); return; }
            if (!calPensumActual) { alert('Primero seleccione una asignatura (pensum)'); return; }

            // Auto-fill concepto según tipo
            const conceptoMap = {
                'D': 'Registro Diario', 'I': 'Examen Intermedio', 'IP': 'Prof. Proc-Intermedios',
                'F': 'Examen Final', 'FP': 'Prof. Examen Final',
                'C1': 'Crédito 1', 'C2': 'Crédito 2', 'CG': 'Crédito G 11', 'N': 'Nivelación'
            };
            const conceptoFinal = concepto || conceptoMap[tipo] || tipo;

            if (!confirm(`¿Crear nuevo registro "${conceptoFinal}" (${tipo}) para TODOS los estudiantes del curso?`)) return;

            const btnCrear = document.querySelector('[onclick="crearNuevaNota()"]');
            if (btnCrear) { btnCrear.disabled = true; btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...'; }

            try {
                // 1. Crear el id_nota (registro maestro)
                const resReg = await fetch(`${API}/profesor/registros`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pensum_id: calPensumActual, codigo: tipo, concepto: conceptoFinal })
                });
                const dataReg = await resReg.json();
                if (!dataReg.success) throw new Error(dataReg.error || 'Error creando id_nota');

                const idNota = dataReg.registro.id;

                // 2. Obtener estudiantes del curso vinculado al pensum
                const pensum = pensumCache.find(p => String(p.subject_id || p._id) === String(calPensumActual));
                const classId = pensum?.class_id || '';
                if (!classId) throw new Error('No se pudo obtener el curso del pensum seleccionado');

                const resEst = await fetch(`${API}/estudiantes?curso=${classId}&limit=200`);
                const dataEst = await resEst.json();
                const estudiantes = (dataEst.estudiantes || dataEst || []).map(e => e.estudiante_id || e.student_id || String(e._id));

                if (!estudiantes.length) {
                    alert('⚠️ id_nota creado, pero no se encontraron estudiantes en este curso.');
                    return;
                }

                // 3. Bulk insert planilla_detalle para cada estudiante
                const resBulk = await fetch(`${API}/calificaciones/detalle/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        estudiantes,
                        codigo_pensum: calPensumActual,
                        id_nota: idNota,
                        concepto: conceptoFinal,
                        tipo_nota: tipo,
                        planilla: calPeriodoActual
                    })
                });
                const dataBulk = await resBulk.json();
                if (!dataBulk.success) throw new Error(dataBulk.error || 'Error creando registros de detalle');

                // 4. Éxito — resetear panel y recargar tabla
                document.getElementById('calNuevoTipoNota').value = '';
                document.getElementById('calNuevoConcepto').value = '';
                toggleNuevaNota();
                alert(`✅ Registro "${conceptoFinal}" creado exitosamente para ${dataBulk.creados} estudiante(s).`);

                // Recargar la planilla actual
                if (calPensumActual && calPeriodoActual) {
                    buscarPlanilla();
                }

            } catch (e) {
                alert('❌ Error: ' + e.message);
                console.error(e);
            } finally {
                if (btnCrear) { btnCrear.disabled = false; btnCrear.innerHTML = '<i class="fas fa-save"></i> Crear Nota'; }
            }
        }


        async function borrarNotaSeleccionada() {
            const notaId = document.getElementById('calSelectNota').value;
            if (!notaId) { alert('Seleccione una nota'); return; }
            if (!confirm('¿Borrar esta nota y todos sus registros?')) return;
            alert('Borrado de nota ID: ' + notaId + '\nProximamente disponible.');
        }

        async function verDetalle(estudiante, pensum) {
            cambiarCalTab('detalle');
            const tbody = document.getElementById('detalleTbody');
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
            try {
                const res = await fetch(`${API}/calificaciones/detalle?estudiante=${estudiante}&pensum=${pensum}`);
                const data = await res.json();
                const notas = data.notas || [];
                const nombre = estudiantesCache[estudiante] || estudiante;
                if (notas.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400)">No hay detalle de notas para ${nombre}</td></tr>`;
                    return;
                }
                tbody.innerHTML = notas.map(n => {
                    const nota = parseFloat(n.nota) || 0;
                    const notaClass = nota >= 95 ? 'badge-success' : nota >= 80 ? 'badge-info' : nota >= 70 ? 'badge-warning' : nota > 0 ? 'badge-danger' : 'badge-violet';
                    return `
                    <tr>
                        <td>${nombre}</td>
                        <td><span class="badge badge-violet">${n.tipo_nota || '—'}</span></td>
                        <td style="max-width:200px;white-space:normal">${n.concepto || '—'}</td>
                        <td style="text-align:center">${n.comp_1 || 0}</td>
                        <td style="text-align:center">${n.comp_2 || 0}</td>
                        <td style="text-align:center">${n.comp_3 || 0}</td>
                        <td style="text-align:center"><span class="badge ${notaClass}">${nota}</span></td>
                        <td style="font-size:0.8rem">${n.fecha_insert ? n.fecha_insert.substring(0, 10) : '—'}</td>
                    </tr>`;
                }).join('');
            } catch (e) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--danger)">Error: ${e.message}</td></tr>`;
            }
        }

        // ── ASISTENCIA ──
        async function cargarAsistencia() {
            const res = await fetch(`${API}/asistencia?limit=100`);
            const data = await res.json();
            const sec = document.getElementById('secAsistencia');
            const tbody = sec.querySelector('tbody');
            tbody.innerHTML = data.registros.map(a => `
                <tr>
                    <td>${a.Id || ''}</td>
                    <td>${a.estudiante}</td>
                    <td style="text-align:center">${a.asiste === '1' ? '<i class="fas fa-check-circle" style="color:var(--success)"></i>' : '<i class="fas fa-times-circle" style="color:var(--danger)"></i>'}</td>
                    <td style="text-align:center">${a.asiste !== '1' ? '<i class="fas fa-check-circle" style="color:var(--danger)"></i>' : ''}</td>
                    <td style="text-align:center">${a.tipo_aus !== 'N' ? a.tipo_aus : ''}</td>
                    <td>${a.comentario || '—'}</td>
                </tr>
            `).join('');
        }

        // ── OBSERVACIONES ──
        async function cargarObservaciones() {
            // Cargar cursos en los selects de planilla e insertar
            try {
                const resCursos = await fetch(`${API}/cursos`);
                const cursos = await resCursos.json();
                const optsCurso = '<option value="">Seleccione Curso</option>' +
                    cursos.map(c => `<option value="${c.curso_id}">${c.codigo} - ${c.nombre || c.codigo}</option>`).join('');
                document.getElementById('obsPlanillaCurso').innerHTML = optsCurso;
                document.getElementById('obsInsCurso').innerHTML = optsCurso;

                // Cargar docentes para insertar
                const resDoc = await fetch(`${API}/docentes`);
                const docentes = await resDoc.json();
                document.getElementById('obsInsDocente').innerHTML = '<option value="">Seleccione Docente</option>' +
                    docentes.map(d => `<option value="${d.teacher_id}">${d.nombre}</option>`).join('');

                // Cargar estudiantes para insertar
                const resEst = await fetch(`${API}/estudiantes?limit=500`);
                const dataEst = await resEst.json();
                document.getElementById('obsInsEstudiante').innerHTML = '<option value="">Seleccione Estudiante</option>' +
                    dataEst.estudiantes.map(e => `<option value="${e.student_id}">${e.nombre}</option>`).join('');
            } catch (e) { console.error('Error cargando datos observador:', e); }
        }

        // Tabs del observador
        function cambiarTabObs(tab, btn) {
            document.querySelectorAll('.obs-tab-content').forEach(t => t.style.display = 'none');
            document.querySelectorAll('.obs-tab').forEach(b => {
                b.classList.remove('active');
                b.style.borderBottom = 'none';
            });
            btn.classList.add('active');
            btn.style.borderBottom = '2px solid var(--primary)';
            const tabMap = { planilla: 'obsTabPlanilla', consulta: 'obsTabConsulta', insertar: 'obsTabInsertar' };
            document.getElementById(tabMap[tab]).style.display = 'block';
        }

        // Planilla de Obs — buscar estudiantes de un curso
        async function buscarPlanillaObs() {
            const cursoId = document.getElementById('obsPlanillaCurso').value;
            if (!cursoId) { alert('Seleccione un curso'); return; }
            const cursoOpt = document.getElementById('obsPlanillaCurso').selectedOptions[0].textContent;
            const cursoCodigo = cursoOpt.split(' - ')[0];
            try {
                const res = await fetch(`${API}/estudiantes?limit=500`);
                const data = await res.json();
                const estudiantes = data.estudiantes.filter(e => e.codigo_curso === cursoCodigo || e.curso === cursoCodigo);
                const tbody = document.getElementById('tbodyPlanillaObs');
                if (estudiantes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray-400)">No se encontraron estudiantes en este curso</td></tr>';
                    return;
                }
                tbody.innerHTML = estudiantes.map(e => `
                    <tr>
                        <td>${cursoCodigo}</td>
                        <td><img src="${e.foto || ''}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;background:var(--gray-200)" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><circle cx=%2220%22 cy=%2215%22 r=%228%22 fill=%22%23999%22/><circle cx=%2220%22 cy=%2238%22 r=%2214%22 fill=%22%23999%22/></svg>'"></td>
                        <td><strong>${e.nombre}</strong></td>
                        <td>
                            <div class="actions" style="gap:4px">
                                <button class="btn btn-sm" style="background:#e74c3c;color:#fff;font-size:0.7rem;padding:3px 8px" onclick="verReporteEstudiante('${e.student_id}','${(e.nombre || '').replace(/'/g, "\\\\'")}')">
                                    <i class="fas fa-file-alt"></i> Reporte <span style="background:#fff;color:#e74c3c;border-radius:50%;padding:0 4px;font-size:0.65rem;margin-left:2px" id="repCount_${e.student_id}">0</span>
                                </button>
                                <button class="btn btn-sm" style="background:#27ae60;color:#fff;font-size:0.7rem;padding:3px 8px" onclick="calificarEstudiante('${e.student_id}','${(e.nombre || '').replace(/'/g, "\\\\'")}')">
                                    <i class="fas fa-star"></i> Calificar
                                </button>
                                <button class="btn btn-sm" style="background:#3498db;color:#fff;font-size:0.7rem;padding:3px 8px" onclick="verObservaciones('${e.student_id}','${(e.nombre || '').replace(/'/g, "\\\\'")}')">
                                    <i class="fas fa-search"></i> Ver
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
                // Contar observaciones por estudiante
                const resObs = await fetch(`${API}/observaciones?limit=1000`);
                const dataObs = await resObs.json();
                estudiantes.forEach(e => {
                    const count = dataObs.observaciones.filter(o => o.estudiante_id === e.student_id || o.estudiante === e.nombre).length;
                    const el = document.getElementById('repCount_' + e.student_id);
                    if (el) el.textContent = count;
                });
            } catch (err) { alert('Error: ' + err.message); }
        }

        // Consulta Obs — buscar observaciones por nombre
        async function buscarConsultaObs() {
            const q = document.getElementById('obsConsultaBuscar').value.trim();
            if (!q) { alert('Ingrese un nombre para buscar'); return; }
            try {
                const res = await fetch(`${API}/observaciones?limit=500`);
                const data = await res.json();
                const filtered = data.observaciones.filter(o => (o.estudiante || '').toLowerCase().includes(q.toLowerCase()));
                const tbody = document.getElementById('tbodyConsultaObs');
                if (filtered.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gray-400)">No se encontraron observaciones</td></tr>';
                    return;
                }
                tbody.innerHTML = filtered.map(o => `
                    <tr>
                        <td>${o.fecha_ocurrencia ? o.fecha_ocurrencia.substring(0, 10) : o.fecha_insert ? o.fecha_insert.substring(0, 10) : '—'}</td>
                        <td>${o.estudiante}</td>
                        <td>${o.pensum || '—'}</td>
                        <td><span class="badge badge-warning">Observación</span></td>
                        <td title="${(o.correctivo || '').substring(0, 200)}">${(o.problema || '').substring(0, 80)}${(o.problema || '').length > 80 ? '...' : ''}</td>
                        <td>${o.docente || '—'}</td>
                    </tr>
                `).join('');
            } catch (err) { alert('Error buscando: ' + err.message); }
        }

        // Ver observaciones de un estudiante
        function verObservaciones(studentId, nombre) {
            document.getElementById('obsConsultaBuscar').value = nombre;
            cambiarTabObs('consulta', document.querySelectorAll('.obs-tab')[1]);
            buscarConsultaObs();
        }

        // Ver reporte de un estudiante (mismo que ver pero desde planilla)
        function verReporteEstudiante(studentId, nombre) {
            verObservaciones(studentId, nombre);
        }

        // Calificar — abre tab insertar con estudiante preseleccionado
        function calificarEstudiante(studentId, nombre) {
            cambiarTabObs('insertar', document.querySelectorAll('.obs-tab')[2]);
            const sel = document.getElementById('obsInsEstudiante');
            for (let opt of sel.options) {
                if (opt.value === studentId) { opt.selected = true; break; }
            }
        }

        // Guardar nueva observación
        async function guardarObservacion() {
            const estudianteId = document.getElementById('obsInsEstudiante').value;
            const problema = document.getElementById('obsInsProblema').value.trim();
            if (!estudianteId || !problema) { alert('Estudiante y Observación son obligatorios'); return; }
            const body = {
                estudiante_id: estudianteId,
                estudiante: document.getElementById('obsInsEstudiante').selectedOptions[0].textContent,
                pensum: document.getElementById('obsInsCurso').selectedOptions[0]?.textContent || '',
                docente: document.getElementById('obsInsDocente').selectedOptions[0]?.textContent || '',
                fecha_ocurrencia: document.getElementById('obsInsFecha').value || new Date().toISOString().substring(0, 10),
                tipo: document.getElementById('obsInsTipo').value,
                problema: problema,
                correctivo: document.getElementById('obsInsCorrectivo').value.trim()
            };
            try {
                const res = await fetch(`${API}/observaciones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success || data._id) {
                    alert('Observación guardada exitosamente');
                    limpiarInsertarObs();
                } else { alert('Error: ' + (data.error || 'No se pudo guardar')); }
            } catch (err) { alert('Error: ' + err.message); }
        }

        function limpiarInsertarObs() {
            ['obsInsEstudiante', 'obsInsCurso', 'obsInsDocente', 'obsInsFecha', 'obsInsPensum', 'obsInsProblema', 'obsInsCorrectivo'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('obsInsTipo').value = 'Académica';
        }

        // ── BOLETINES ──
        function cambiarTabBol(tab, btn) {
            const tabs = ['bolTabIntermedio', 'bolTabPeriodo', 'bolTabCursoGlobal', 'bolTabCursoMateria', 'bolTabCursoRegDiario'];
            tabs.forEach(t => document.getElementById(t).style.display = 'none');
            document.querySelectorAll('#secBoletines .obs-tab').forEach(b => {
                b.classList.remove('active');
                b.style.borderBottom = 'none';
            });
            btn.classList.add('active');
            btn.style.borderBottom = '3px solid var(--primary)';
            const tabMap = { intermedio: 'bolTabIntermedio', periodo: 'bolTabPeriodo', cursoGlobal: 'bolTabCursoGlobal', cursoMateria: 'bolTabCursoMateria', cursoRegDiario: 'bolTabCursoRegDiario' };
            document.getElementById(tabMap[tab]).style.display = 'block';
        }

        async function cargarBoletinCursos() {
            try {
                // Cargar cursos
                const res = await fetch(`${API}/cursos`);
                const cursos = await res.json();
                const opts = '<option value="">Seleccione Curso</option>' + cursos.map(c => `<option value="${c.curso_id}">${c.codigo} - ${c.nombre || c.codigo}</option>`).join('');
                ['bolIntCurso', 'bolPerCurso', 'bolCGCurso', 'bolCMCurso', 'bolRDCurso'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.innerHTML = opts;
                });
                // Cargar periodos dinámicamente
                const resP = await fetch(`${API}/planillas?estado=A`);
                const planillas = await resP.json();
                if (planillas.length > 0) {
                    const pOpts = planillas.map(p => `<option value="${p.Id || p._id}">P${p.periodo} - ${p.anno}</option>`).join('');
                    ['bolIntPeriodo', 'bolPerPeriodo', 'bolCGPeriodo', 'bolCMPeriodo', 'bolRDPeriodo'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.innerHTML = pOpts;
                    });
                }
            } catch (e) { console.error('Error cargando cursos boletines:', e); }
        }

        async function consultarBoletin(tipo) {
            const prefixMap = { intermedio: 'Int', periodo: 'Per', cursoGlobal: 'CG', cursoMateria: 'CM', cursoRegDiario: 'RD' };
            const prefix = prefixMap[tipo];
            const cursoSel = document.getElementById(`bol${prefix}Curso`);
            const periodoSel = document.getElementById(`bol${prefix}Periodo`);
            const cursoId = cursoSel ? cursoSel.value : '';
            const periodoId = periodoSel ? periodoSel.value : '';
            if (!cursoId) { alert('Seleccione un curso'); return; }
            const resultDiv = document.getElementById(`bol${prefix}Resultado`);

            // CG11 solo aplica a Grado 11 — declarado aquí para todos los sub-bloques
            const cursoTexto = cursoSel ? (cursoSel.selectedOptions[0]?.textContent || '') : '';
            const esGrado11 = /\b11\b/.test(cursoTexto);

            // Extraer número de periodo del selector ("P1 - 2026" → 1)
            const periodoTexto = periodoSel ? (periodoSel.selectedOptions[0]?.textContent || '') : '';
            const periodoNumero = parseInt(periodoTexto.replace(/^P(\d+).*/, '$1')) || 1;

            resultDiv.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400)"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem"></i><br>Cargando boletines...</div>';

            try {
                const res = await fetch(`${API}/boletines/intermedio?curso_id=${cursoId}&periodo=${periodoId}`);
                const data = await res.json();
                const boletines = data.boletines || [];

                if (boletines.length === 0) {
                    resultDiv.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)"><i class="fas fa-user-slash" style="font-size:2rem;display:block;margin-bottom:8px"></i>No se encontraron estudiantes en este curso</div>';
                    return;
                }

                // ── CURSO x MATERIA: full grade columns for a single subject ──
                if (tipo === 'cursoMateria') {
                    const cursoCodigo = cursoSel.selectedOptions[0].textContent.split(' - ')[0];
                    const materiaSel = document.getElementById('bolCMMateria');
                    const materiaId = materiaSel ? materiaSel.value : '';
                    const materiaNombre = materiaSel && materiaSel.selectedOptions[0] ? materiaSel.selectedOptions[0].textContent : '';
                    if (!materiaId) { alert('Seleccione una materia'); return; }
                    const fotoSvg = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><circle cx=%2225%22 cy=%2219%22 r=%2210%22 fill=%22%23999%22/><circle cx=%2225%22 cy=%2248%22 r=%2218%22 fill=%22%23999%22/></svg>`;
                    const hsc = 'padding:6px 4px;font-size:0.68rem;text-align:center';
                    const cs = 'text-align:center;padding:5px 3px;font-size:0.75rem';
                    resultDiv.innerHTML = `
                    <div class="table-container" style="overflow-x:auto">
                        <table class="data-table" style="font-size:0.75rem;min-width:1300px">
                            <thead style="background:var(--gray-50)">
                                <tr>
                                    <th style="${hsc}">Curso</th>
                                    <th style="${hsc}">Codigo</th>
                                    <th style="${hsc};text-align:left;min-width:140px">Nombre</th>
                                    <th style="${hsc};text-align:left;min-width:100px">Asignatura</th>
                                    <th style="${hsc}">RD</th>
                                    <th style="${hsc}">60%</th>
                                    <th style="${hsc}">PI</th>
                                    <th style="${hsc}">PIRP</th>
                                    <th style="${hsc}">40%</th>
                                    <th style="${hsc};background:rgba(46,204,113,0.12);font-weight:700">N.G 60%<br><span style="font-size:0.55rem">(Parcial)</span></th>
                                    <th style="${hsc}">C1</th>
                                    <th style="${hsc}">C2</th>
                                    <th style="${hsc}">B1</th>
                                    <th style="${hsc}">B2</th>
                                    <th style="${hsc};background:rgba(46,204,113,0.12)">N.G 60%</th>
                                    <th style="${hsc}">EF</th>
                                    <th style="${hsc}">EFRP</th>
                                    <th style="${hsc};background:rgba(255,152,0,0.12)">N.G 40%</th>
                                    <th style="${hsc};background:rgba(33,150,243,0.12);font-weight:700">NFP1</th>
                                    <th style="${hsc}">NFP2</th>
                                    <th style="${hsc}">NFP3</th>
                                    <th style="${hsc}">NFP4</th>
                                    <th style="${hsc};font-weight:700;color:#e74c3c">NMPP</th>
                                    <th style="${hsc}">INDICADOR</th>
                                    <th style="${hsc}">ACUM.GRAL</th>
                                    <th style="${hsc}">Cg11</th>
                                    <th style="${hsc}">B3</th>
                                    <th style="${hsc};background:rgba(52,152,219,0.12);font-weight:700">Acum.<br>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${boletines.map(est => {
                        const m = est.materias.find(x => x.pensum_id === materiaId) || est.materias[0];
                        const rd   = m.D  || 0;  const pi = m.I  || 0;  const pirp = m.IP || 0;
                        const ef   = m.F  || 0;  const efrp = m.FP || 0;
                        const c1   = m.C1 || 0;  const c2   = m.C2 || 0;
                        // CG11 solo existe en Grado 11
                        const cg11cm = esGrado11 ? (m.CG || 0) : 0;
                        // Tabla de bonos (mismo PHP)
                        function calcBonoCM(cr) {
                            if (cr >= 95) return 20; if (cr >= 90) return 18;
                            if (cr >= 85) return 15; if (cr >= 80) return 13;
                            if (cr >= 75) return 10; if (cr >= 70) return 8;
                            if (cr >= 65) return 5;  if (cr >= 60) return 3;
                            return 0;
                        }
                        const bono1cm = calcBonoCM(c1);
                        const bono2cm = calcBonoCM(c2);
                        const bono3cm = calcBonoCM(cg11cm);
                        const b1cm = '+' + bono1cm;
                        const b2cm = '+' + bono2cm;
                        const b3cm = esGrado11 ? (bono3cm > 0 ? '+' + bono3cm : '0') : '—';
                        // N.G 60%: promedio proceso × 0.6 + bonos, cap 60
                        const comp60cm = [rd, pi, pirp].filter(x => x > 0);
                        const ng60P = comp60cm.length ? Math.round(comp60cm.reduce((a,b)=>a+b,0)/comp60cm.length) : 0;
                        const ng60Parcial_cm = Math.round(ng60P * 0.6);
                        const ng60Pond_cm = Math.min(60, ng60Parcial_cm + bono1cm + bono2cm);
                        const col60cm = ng60Parcial_cm;
                        const col40cm = ef > 0 ? Math.round(ef * 0.4) : 0;
                        // N.G 40%: mejor(EF,EFRP) × 0.4, cap 40
                        const examFinalCM = (ef > 0 && efrp > 0) ? Math.max(ef, efrp) : (ef || efrp);
                        const ng40Pond_cm = Math.round(examFinalCM * 0.4);
                        // NFP1 = N.G 60% + N.G 40%, cap 100
                        const nfp1 = examFinalCM > 0
                            ? Math.min(100, ng60Pond_cm + ng40Pond_cm)
                            : Math.min(100, ng60Pond_cm);
                        // NMPP, ACUM, NOTA FINAL
                        const nmpp = Math.max(0, Math.min(100, 140 - nfp1));
                        const acumGral = Math.min(100, Math.round(nfp1 * 0.33) + bono3cm);
                        const notaFinal = Math.min(100, nfp1 + bono3cm);
                        const indLabel = nfp1 >= 95 ? 'MUY SUPERIOR' : nfp1 >= 80 ? 'SUPERIOR' : nfp1 >= 60 ? 'BÁSICO' : 'BAJO';
                        const colNf = colorNota(notaFinal);
                        return `<tr>
                            <td style="${cs}">${cursoCodigo}</td>
                            <td style="${cs};font-weight:600">${est.estudiante_id}</td>
                            <td style="${cs};text-align:left;padding-left:6px;font-weight:600;font-size:0.72rem">${est.nombre}</td>
                            <td style="${cs};text-align:left;font-size:0.7rem">${materiaNombre}</td>
                            <td style="${cs}">${rd}</td>
                            <td style="${cs};font-weight:600;color:var(--primary)">${col60cm}</td>
                            <td style="${cs}">${pi}</td>
                            <td style="${cs}">${pirp}</td>
                            <td style="${cs};font-weight:600;color:var(--warning)">${col40cm > 0 ? col40cm : ''}</td>
                            <td style="${cs};background:rgba(46,204,113,0.08);font-weight:700;color:#27ae60">${ng60Parcial_cm}</td>
                            <td style="${cs}">${c1}</td>
                            <td style="${cs}">${c2}</td>
                            <td style="${cs};color:var(--success);font-weight:700">${b1cm}</td>
                            <td style="${cs};color:var(--success);font-weight:700">${b2cm}</td>
                            <td style="${cs};background:rgba(46,204,113,0.08);font-weight:700;color:#27ae60">${ng60Pond_cm}</td>
                            <td style="${cs}">${ef}</td>
                            <td style="${cs}">${efrp}</td>
                            <td style="${cs};background:rgba(255,152,0,0.08);font-weight:700;color:#e67e22">${ng40Pond_cm}</td>
                            <td style="${cs};background:rgba(33,150,243,0.08);font-weight:700">${nfp1}</td>
                            <td style="${cs}">0</td><td style="${cs}">0</td><td style="${cs}">0</td>
                            <td style="${cs};font-weight:700;color:#e74c3c">${nmpp}</td>
                            <td style="${cs}"><span style="background:${colorIndicador(indLabel)};color:#fff;padding:2px 6px;border-radius:4px;font-size:0.6rem;font-weight:700;white-space:nowrap">${indLabel}</span></td>
                            <td style="${cs}">${acumGral}</td>
                            <td style="${cs}">${cg11cm}</td>
                            <td style="${cs};color:var(--success);font-weight:700">${b3cm}</td>
                            <td style="${cs};background:rgba(52,152,219,0.08);font-weight:700;color:${colNf}">${notaFinal}</td>
                        </tr>`;
                    }).join('')}
                            </tbody>
                        </table>
                    </div>`;
                    return;
                }

                // ── REGISTRO DIARIO: tabla individual de registros ──────────────
                if (tipo === 'cursoRegDiario') {
                    const cursoCodigo = cursoSel.selectedOptions[0].textContent.split(' - ')[0];
                    // Llamar al nuevo endpoint dedicado
                    const rdRes  = await fetch(`${API}/boletines/regdiario?curso_id=${cursoId}&periodo=${periodoId}`);
                    const rdData = await rdRes.json();
                    const rdBols = rdData.boletines || [];
                    if (!rdBols.length) {
                        resultDiv.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)"><i class="fas fa-user-slash" style="font-size:2rem;display:block;margin-bottom:8px"></i>No hay registros diarios en este curso</div>';
                        return;
                    }
                    const MAX_REG = 7;
                    const hRD = 'padding:5px 3px;font-size:0.65rem;text-align:center;white-space:nowrap';
                    const cRD = 'text-align:center;padding:4px 3px;font-size:0.72rem';
                    const cRDg = cRD + ';background:rgba(46,204,113,0.08);font-weight:700';
                    const cRDp = cRD + ';background:rgba(33,150,243,0.08);font-weight:700';

                    // Una tabla por materia
                    resultDiv.innerHTML = rdBols[0].materias.map((matRef, mIdx) => {
                        // Encabezados de registros 1..7
                        const thRegs = Array.from({length: MAX_REG}, (_,i) =>
                            `<th colspan="4" style="${hRD};background:rgba(255,152,0,0.08);border-left:1px solid var(--gray-200)">Registro ${i+1}<br><span style="font-size:0.55rem;font-weight:400">C1 C2 C3 NT</span></th>`
                        ).join('');
                        const thSubRegs = Array.from({length: MAX_REG}, () =>
                            ['C1','C2','C3','NT'].map(s =>
                                `<th style="${hRD};font-weight:600">${s}</th>`
                            ).join('')
                        ).join('');

                        const rows = rdBols.map(est => {
                            const mat = est.materias[mIdx] || {};
                            const regs = mat.registros || Array(MAX_REG).fill({c1:0,c2:0,c3:0,nt:0});
                            const regCells = regs.map(r =>
                                `<td style="${cRD}">${r.c1||0}</td><td style="${cRD}">${r.c2||0}</td><td style="${cRD}">${r.c3||0}</td><td style="${cRD};font-weight:600">${r.nt||0}</td>`
                            ).join('');
                            const pct60c = colorNota(mat.pct60 || 0);
                            return `<tr>
                                <td style="${cRD}">${cursoCodigo}</td>
                                <td style="${cRD};font-weight:700;color:var(--primary)">${est.estudiante_id}</td>
                                <td style="${cRD};text-align:left;padding-left:6px;font-weight:600;min-width:180px">${est.nombre}</td>
                                ${regCells}
                                <td style="${cRDg}">${mat.promC1||0}</td>
                                <td style="${cRDg}">${mat.promC2||0}</td>
                                <td style="${cRDg}">${mat.promC3||0}</td>
                                <td style="${cRDg}">${mat.promNT||0}</td>
                                <td style="${cRDp};color:${pct60c}">${mat.pct60||0}</td>
                            </tr>`;
                        }).join('');

                        return `
                        <div style="margin-bottom:28px">
                            <div style="padding:8px 14px;background:var(--primary);color:#fff;border-radius:var(--radius) var(--radius) 0 0;font-weight:700;font-size:0.85rem">
                                ${matRef.asignatura}
                            </div>
                            <div class="table-container" style="overflow-x:auto">
                                <table class="data-table" style="font-size:0.72rem;min-width:1400px">
                                    <thead style="background:var(--gray-50)">
                                        <tr>
                                            <th rowspan="2" style="${hRD};min-width:50px">Curso</th>
                                            <th rowspan="2" style="${hRD};min-width:60px">Codigo</th>
                                            <th rowspan="2" style="${hRD};text-align:left;min-width:180px;padding-left:6px">Nombre</th>
                                            ${thRegs}
                                            <th colspan="4" style="${hRD};background:rgba(46,204,113,0.15);border-left:2px solid #27ae60">PROMEDIOS<br><span style="font-size:0.55rem;font-weight:400">C1 C2 C3 NT</span></th>
                                            <th rowspan="2" style="${hRD};background:rgba(33,150,243,0.15);min-width:40px">60%</th>
                                        </tr>
                                        <tr>${thSubRegs}<th style="${hRD};background:rgba(46,204,113,0.1)">C1</th><th style="${hRD};background:rgba(46,204,113,0.1)">C2</th><th style="${hRD};background:rgba(46,204,113,0.1)">C3</th><th style="${hRD};background:rgba(46,204,113,0.1)">NT</th></tr>
                                    </thead>
                                    <tbody>${rows}</tbody>
                                </table>
                            </div>
                        </div>`;
                    }).join('');
                    return;
                }

                // ── CURSO GLOBAL: pivot table de notas finales ──────────────────
                if (tipo === 'cursoGlobal') {
                    const cursoCodigo = cursoSel.selectedOptions[0].textContent.split(' - ')[0];
                    const materias = boletines[0].materias;
                    const fotoSvg = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><circle cx=%2225%22 cy=%2219%22 r=%2210%22 fill=%22%23999%22/><circle cx=%2225%22 cy=%2248%22 r=%2218%22 fill=%22%23999%22/></svg>`;
                    function abreviar(n) {
                        const skip = ['Y', 'DE', 'LA', 'EL', 'LOS', 'LAS', 'EN', 'DEL'];
                        const w = n.toUpperCase().replace(/[^A-ZÑ ]/g, ' ').split(/\s+/).filter(x => x);
                        const s = w.filter(x => !skip.includes(x));
                        if (s.length <= 1) return (s[0] || '').substring(0, 5);
                        if (s.length === 2) return s[0].substring(0, 3) + s[1].substring(0, 2);
                        return s.map(x => x[0]).join('').substring(0, 6);
                    }
                    const abrevs = materias.map(m => abreviar(m.asignatura));
                    const hsc = 'padding:8px 6px;font-size:0.72rem;text-align:center';
                    resultDiv.innerHTML = `
                    <div style="margin-bottom:10px">
                        <button class="btn btn-sm" style="background:#27ae60;color:#fff;font-size:0.75rem;padding:5px 14px"><i class="fas fa-check-circle"></i> Acum. Final</button>
                    </div>
                    <div class="table-container" style="overflow-x:auto">
                        <table class="data-table" style="font-size:0.78rem">
                            <thead style="background:var(--gray-50)">
                                <tr>
                                    <th style="${hsc}">Curso</th>
                                    <th style="${hsc}">Codigo</th>
                                    <th style="${hsc}">Foto</th>
                                    <th style="${hsc};text-align:left;min-width:180px">Nombre</th>
                                    ${abrevs.map(a => `<th style="${hsc};min-width:50px">${a}</th>`).join('')}
                                    <th style="${hsc};background:rgba(52,152,219,0.12);font-weight:700;min-width:60px">Promedio</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${boletines.map(est => {
                        const notas = est.materias.map(m => {
                            const comp60 = [m.D, m.I, m.IP].filter(x => x > 0);
                            const ng60 = comp60.length ? Math.round(comp60.reduce((a,b)=>a+b,0)/comp60.length) : 0;
                            const comp40 = [m.F, m.FP].filter(x => x > 0);
                            const ng40 = comp40.length ? Math.round(comp40.reduce((a,b)=>a+b,0)/comp40.length) : 0;
                            return ng40 > 0 ? Math.round(ng60*0.6 + ng40*0.4) : ng60;
                        });
                        const notasValidas = notas.filter(n => n > 0);
                        const prom = notasValidas.length > 0 ? Math.round(notasValidas.reduce((a,b)=>a+b,0)/notasValidas.length) : 0;
                        return '<tr>' +
                            `<td style="text-align:center;padding:6px">${cursoCodigo}</td>` +
                            `<td style="text-align:center;padding:6px;font-weight:600">${est.estudiante_id}</td>` +
                            `<td style="text-align:center;padding:6px"><img src="${fotoSvg}" style="width:32px;height:32px;border-radius:50%;background:var(--gray-200)"></td>` +
                            `<td style="padding:6px 10px;font-weight:600">${est.nombre}</td>` +
                            notas.map(n => {
                                const col = colorNota(n);
                                return `<td style="text-align:center;padding:6px;color:${col};font-weight:${n<30?'700':'400'}">${n}</td>`;
                            }).join('') +
                            `<td style="text-align:center;padding:6px;background:rgba(52,152,219,0.08);font-weight:700">${prom}</td>` +
                            '</tr>';
                    }).join('')}
                            </tbody>
                        </table>
                    </div>`;
                    return;
                }

                // ── INTERMEDIO / PERIODO: per-student cards with subject rows ──
                const esPeriodo = (tipo === 'periodo');
                const foto = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 50 50%22><circle cx=%2225%22 cy=%2219%22 r=%2210%22 fill=%22%23999%22/><circle cx=%2225%22 cy=%2248%22 r=%2218%22 fill=%22%23999%22/></svg>`;
                const hs = 'padding:8px 4px;font-size:0.7rem;text-align:center';

                resultDiv.innerHTML = boletines.map(est => {
                    return `
                    <div style="border:1px solid var(--gray-200);border-radius:var(--radius);margin-bottom:24px;overflow:hidden;background:var(--surface)">
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--gray-200)">
                            <div style="display:flex;align-items:center;gap:16px">
                                <div style="text-align:center">
                                    <div style="font-size:0.7rem;color:var(--gray-500);font-weight:600;margin-bottom:4px">Foto</div>
                                    <img src="${foto}" style="width:48px;height:48px;border-radius:50%;background:var(--gray-200)">
                                </div>
                                <div>
                                    <div style="font-size:0.7rem;color:var(--gray-500);font-weight:600;margin-bottom:2px">Nombre</div>
                                    <div style="font-weight:700;font-size:1rem">${est.nombre}</div>
                                </div>
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap">
                                <button class="btn btn-sm" style="background:var(--gray-100);color:var(--gray-700);border:1px solid var(--gray-300);font-size:0.75rem;padding:4px 10px" onclick="generarPDFBoletinEstudiante('${est.estudiante_id}')"><i class="fas fa-file-pdf"></i> pdf</button>
                                <button class="btn btn-sm" style="background:var(--gray-100);color:var(--gray-700);border:1px solid var(--gray-300);font-size:0.75rem;padding:4px 10px"><i class="fas fa-file-alt"></i> Log</button>
                                ${esPeriodo ? `<button class="btn btn-sm" style="background:var(--gray-100);color:var(--gray-700);border:1px solid var(--gray-300);font-size:0.75rem;padding:4px 10px"><i class="fas fa-flag"></i> Final</button>
                                <button class="btn btn-sm" style="background:var(--gray-100);color:var(--gray-700);border:1px solid var(--gray-300);font-size:0.75rem;padding:4px 10px"><i class="fas fa-eye"></i> Obs. Final</button>` : ''}
                            </div>
                        </div>
                        <div class="table-container" style="overflow-x:auto">
                            <table class="data-table" style="font-size:0.75rem;min-width:${esPeriodo ? '1200' : '700'}px">
                                <thead style="background:var(--gray-50)">
                                    <tr>
                                        <th style="${hs};text-align:left;min-width:160px;padding-left:10px">Asignatura</th>
                                        <th style="${hs}">RD</th>
                                        <th style="${hs};color:var(--primary)">60%</th>
                                        <th style="${hs}">PI</th>
                                        <th style="${hs}">PIRP</th>
                                        <th style="${hs}">40%</th>
                                        <th style="${hs};background:rgba(46,204,113,0.12);font-weight:700">N.G 60%<br><span style="font-size:0.6rem;font-weight:400">(Parcial)</span></th>
                                        <th style="${hs}">C1</th>
                                        <th style="${hs}">C2</th>
                                        <th style="${hs}">B1</th>
                                        <th style="${hs}">B2</th>
                                        ${esPeriodo ? `
                                        <th style="${hs};background:rgba(46,204,113,0.12);font-weight:700">N.G 60%</th>
                                        <th style="${hs}">EF</th>
                                        <th style="${hs}">EFRP</th>
                                        <th style="${hs};background:rgba(255,152,0,0.12);font-weight:700">N.G 40%</th>
                                        <th style="${hs};background:rgba(33,150,243,0.12);font-weight:700">NFP1</th>
                                        <th style="${hs}">NFP2</th>
                                        <th style="${hs}">NFP3</th>
                                        <th style="${hs}">NMPP</th>
                                        <th style="${hs}">INDICADOR</th>
                                        <th style="${hs}">ACUM.GRAL</th>
                                        <th style="${hs}">Cg11</th>
                                        <th style="${hs}">B3</th>
                                        ` : ''}
                                        <th style="${hs};background:rgba(52,152,219,0.12);font-weight:700">Nota${esPeriodo ? '<br>Final' : ' Global'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${est.materias.map(m => {
                        const rd   = m.D  || 0;
                        const pi   = m.I  || 0;
                        const pirp = m.IP || 0;
                        const ef   = m.F  || 0;
                        const efrp = m.FP || 0;
                        const c1   = m.C1 || 0;   // credito1 (nota bruta 0-100)
                        const c2   = m.C2 || 0;   // credito2 (nota bruta 0-100)
                        // CG11: solo aplica a Grado 11; para otros cursos siempre = 0
                        const cg11 = esGrado11 ? (m.CG || 0) : 0;

                        // ── Tabla de bonos (PHP portada a JS) ──────────────────
                        function calcBono(credito) {
                            if (credito >= 95) return 20;
                            if (credito >= 90) return 18;
                            if (credito >= 85) return 15;
                            if (credito >= 80) return 13;
                            if (credito >= 75) return 10;
                            if (credito >= 70) return 8;
                            if (credito >= 65) return 5;
                            if (credito >= 60) return 3;
                            return 0;
                        }
                        const bono1 = calcBono(c1);    // B1: bono de credito1
                        const bono2 = calcBono(c2);    // B2: bono de credito2
                        // bono3 solo aplica a Grado 11
                        const bono3 = esGrado11 ? calcBono(cg11) : 0;

                        // Mostrar B1, B2 con "+" (son los puntos de bono)
                        const b1 = '+' + bono1;
                        const b2 = '+' + bono2;
                        const b3 = esGrado11 && bono3 > 0 ? '+' + bono3 : (esGrado11 ? '0' : '—');

                        // ── PROCESO (columna 60%) ───────────────────────────────
                        // RD, PI, PIRP: notas de proceso → promedio base
                        const comp60Base = [rd, pi, pirp].filter(x => x > 0);
                        const ng60Raw = comp60Base.length
                            ? Math.round(comp60Base.reduce((a,b)=>a+b,0) / comp60Base.length)
                            : 0;

                        // N.G 60% PARCIAL ponderado → max 60
                        const ng60Parcial = Math.round(ng60Raw * 0.6);

                        // Columna mini "60%" = ng60Parcial × 0.6 (fracción del aporte)
                        const col60 = ng60Parcial;
                        // Columna mini "40%" = aporte del EF al 40% (informativo)
                        const col40 = ef > 0 ? Math.round(ef * 0.4) : 0;

                        // N.G 60% FULL = parcial + bonos de créditos (cap 60)
                        const ng60Ponderado = Math.min(60, ng60Parcial + bono1 + bono2);

                        // ── EXAMEN FINAL (columna 40%) ──────────────────────────
                        // Si hay recuperación (EFRP), se toma la mejor nota
                        const examFinal = (ef > 0 && efrp > 0)
                            ? Math.max(ef, efrp)
                            : (ef || efrp);
                        // N.G 40% PONDERADO → max 40
                        const ng40Ponderado = Math.round(examFinal * 0.4);

                        // ── NFP1: Nota Final del Periodo ────────────────────────
                        // NFP1 = N.G 60% Full + N.G 40% → max 100
                        const nfp1 = examFinal > 0
                            ? Math.min(100, ng60Ponderado + ng40Ponderado)
                            : Math.min(100, ng60Ponderado);

                        // ── NMPP: Nota Mínima Para Promover ─────────────────────
                        // Formula PHP exacta (3 periodos activos, aprobación >= 70/periodo):
                        //   P1: nota_min = 140 - NFP1  (P2+P3 deben sumar al menos eso)
                        //   P2: nota_min = 210 - (acum_P1+P2)  → aquí acum = nfp1 (solo P2 disponible)
                        //   P3: sin nota_min (último periodo)
                        let nmpp = 0;
                        if (periodoNumero === 1) {
                            nmpp = Math.max(0, Math.min(100, 140 - nfp1));
                        } else if (periodoNumero === 2) {
                            // Necesita suma acumulada P1+P2; aquí solo tenemos P2 como nfp1
                            // Estimamos: necesita (210 - nfp1) pero real requiere P1 del DB
                            nmpp = Math.max(0, Math.min(100, 210 - nfp1));
                        }
                        // P3 → nmpp = 0 (último periodo activo)

                        // ── ACUM.GRAL (formula PHP exacta) ────────────────────────
                        // acum_gral = min(100, round(nfp1 * 0.33) + bono3)
                        // bono3 = 0 para cursos != Grado 11 (garantizado por esGrado11)
                        const acumNotaFinal = nfp1;
                        const acumGral = Math.min(100, Math.round(acumNotaFinal * 0.33) + bono3);

                        const nfp2 = 0; const nfp3 = 0;

                        // ── Indicador de desempeño (basado en NFP1) ─────────────
                        const indLabel = nfp1 >= 95 ? 'MUY SUPERIOR'
                                       : nfp1 >= 80 ? 'SUPERIOR'
                                       : nfp1 >= 60 ? 'BÁSICO'
                                       : 'BAJO';

                        // ── NOTA FINAL ──────────────────────────────────────────
                        // Grado 11: NFP1 + bono3 (creditog11), cap 100
                        // Otros cursos: bono3 = 0 → notaFinal = nfp1
                        const notaFinal = Math.min(100, nfp1 + bono3);
                        const colorNf = colorNota(notaFinal);
                        const cs = 'text-align:center;padding:4px';
                        return `<tr>
                                            <td style="padding:6px 10px;font-weight:600;font-size:0.74rem">${m.asignatura}</td>
                                            <td style="${cs}">${rd}</td>
                                            <td style="${cs};font-weight:600;color:var(--primary)">${col60}</td>
                                            <td style="${cs}">${pi}</td>
                                            <td style="${cs}">${pirp}</td>
                                            <td style="${cs};font-weight:600;color:var(--warning)">${col40 > 0 ? col40 : ''}</td>
                                            <td style="${cs};background:rgba(46,204,113,0.12);font-weight:700;color:#27ae60">${ng60Parcial}</td>
                                            <td style="${cs}">${c1}</td>
                                            <td style="${cs}">${c2}</td>
                                            <td style="${cs};color:var(--success);font-weight:700">${b1}</td>
                                            <td style="${cs};color:var(--success);font-weight:700">${b2}</td>
                                            ${esPeriodo ? `
                                            <td style="${cs};background:rgba(46,204,113,0.12);font-weight:700;color:#27ae60">${ng60Ponderado}</td>
                                            <td style="${cs}">${ef}</td>
                                            <td style="${cs}">${efrp}</td>
                                            <td style="${cs};background:rgba(255,152,0,0.12);font-weight:700;color:#e67e22">${ng40Ponderado}</td>
                                            <td style="${cs};background:rgba(33,150,243,0.12);font-weight:700">${nfp1}</td>
                                            <td style="${cs}">${nfp2}</td>
                                            <td style="${cs}">${nfp3}</td>
                                            <td style="${cs};font-weight:700;color:#e74c3c">${nmpp}</td>
                                            <td style="${cs}"><span style="background:${colorIndicador(indLabel)};color:#fff;padding:2px 6px;border-radius:4px;font-size:0.6rem;font-weight:700;white-space:nowrap">${indLabel}</span></td>
                                            <td style="${cs}">${acumGral}</td>
                                            <td style="${cs}">${cg11}</td>
                                            <td style="${cs};color:var(--success);font-weight:700">${b3}</td>
                                            ` : ''}
                                            <td style="${cs};background:rgba(52,152,219,0.12);font-weight:700;color:${colorNf}">${esPeriodo ? notaFinal : (m.CG > 0 ? m.CG : ng60Parcial)}</td>
                                        </tr>`;
                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                }).join('');
            } catch (err) {
                resultDiv.innerHTML = '<div style="text-align:center;padding:30px;color:var(--danger)"><i class="fas fa-exclamation-triangle" style="font-size:1.5rem;display:block;margin-bottom:8px"></i>Error: ' + err.message + '</div>';
            }
        }

        // -- HELPER: genera el HTML de UNA pagina de boletin periodo (layout reorganizado) --
        // ihMap = { 'NOMBRE ASIGNATURA': intensidadHoraria } obtenido del pensum
        // logrosMap = { 'NOMBRE ASIGNATURA': [descripcion,...] } opcional
        function _buildPeriodoPage(cardEl, contexto, idx, total, ihMap, logrosMap) {
            var cursoNom = contexto.cursoNom, periodo = contexto.periodo,
                fecha = contexto.fecha, titulo = contexto.titulo;
            ihMap     = ihMap     || {};
            logrosMap = logrosMap || {};

            // Nombre y foto
            var nombreEl = cardEl.querySelector('[style*="font-size:1rem"]');
            var nombre   = nombreEl ? nombreEl.textContent.trim().replace(/\s+/g,' ') : 'Estudiante';
            var fotoEl   = cardEl.querySelector('img');
            var fotoSrc  = fotoEl ? fotoEl.src : '';
            var pdfBtn   = cardEl.querySelector('button[onclick*="generarPDFBoletin"]') ||
                           cardEl.querySelector('button[onclick*="Estudiante"]');
            var estId = '';
            if (pdfBtn) { var mm = pdfBtn.getAttribute('onclick').match(/'([^']+)'/); if (mm) estId = mm[1]; }

            var fotoHTML = (fotoSrc && fotoSrc.indexOf('undefined') < 0 && fotoSrc.length > 10)
                ? '<img src="' + fotoSrc + '" style="width:60px;height:60px;object-fit:cover;border-radius:50%;border:2px solid rgba(255,255,255,0.4)">'
                : '<svg viewBox="0 0 80 80" width="60" height="60"><circle cx="40" cy="28" r="19" fill="rgba(255,255,255,0.5)"/><ellipse cx="40" cy="74" rx="30" ry="20" fill="rgba(255,255,255,0.5)"/></svg>';

            // Indicador badge — colores coinciden con colorIndicador() del DOM
            // MUY SUPERIOR=verde, SUPERIOR=azul, BASICO=naranja, BAJO=rojo
            function indBadge(ind) {
                var i = (ind||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
                var bg, fg;
                if (i === 'MUY SUPERIOR') {
                    bg = '#d1fae5'; fg = '#065f46'; // verde oscuro
                } else if (i === 'SUPERIOR') {
                    bg = '#dbeafe'; fg = '#1e40af'; // azul
                } else if (i === 'ALTO') {
                    bg = '#ede9fe'; fg = '#5b21b6'; // morado
                } else if (i === 'BASICO' || i === 'B SICO') {
                    bg = '#fef3c7'; fg = '#92400e'; // naranja/amarillo
                } else {
                    bg = '#fee2e2'; fg = '#b91c1c'; // rojo BAJO
                }
                return '<span style="background:'+bg+';color:'+fg+';border-radius:4px;padding:2px 7px;font-weight:700;font-size:0.62rem">'+ind+'</span>';
            }
            function notaFinalBadge(nota) {
                var n = parseFloat(nota)||0;
                var bg = n<60?'#fee2e2': n<70?'#fef3c7':'#dcfce7';
                var fg = n<60?'#b91c1c': n<70?'#92400e':'#166534';
                return '<div style="background:'+bg+';color:'+fg+';border-radius:6px;padding:5px 14px;font-weight:900;font-size:1rem;display:inline-block">'+nota+'</div>';
            }

            // Filas de materias
            var filas = Array.from(cardEl.querySelectorAll('tbody tr')).map(function(tr) {
                var c = Array.from(tr.querySelectorAll('td'));
                var g = function(i) { return c[i] ? c[i].innerText.trim() : '0'; };
                if (c.length >= 20) {
                    return { tipo:'periodo', materia:g(0),
                        rd:g(1), ng60:g(2), pi:g(3), pirp:g(4), ng40:g(5),
                        b1:g(9), b2:g(10), ef:g(12), efrp:g(13),
                        nfp1:g(15), nfp2:g(16), nfp3:g(17), nmpp:g(18),
                        indicador:g(19), acum:g(20), cg11:g(21), nota:g(c.length-1) };
                }
                return { tipo:'intermedio', materia:g(0), rd:g(1), pi:g(3), pirp:g(4), nota:g(c.length-1) };
            }).filter(function(f){ return f.materia; });

            // ── BLOQUE POR ASIGNATURA ──
            // Layout reorganizado: flujo academico logico
            // [Nombre + IH/AUS] → [RD 60%] → [Proceso Intermedio] → [Examen Final 40%]
            // [Notas P1, P2, P3, Acumulado] → [Indicador + NMPP + CG11 + NOTA FINAL]
            var bloquesHTML = filas.map(function(f, i) {
                var rowBg = i%2===0 ? '#f8fafc' : '#ffffff';
                // Buscar IH en el mapa por nombre de asignatura (case-insensitive)
                var matKey = f.materia.trim().toUpperCase();
                var ih = ihMap[matKey] || '-';

                if (f.tipo === 'intermedio') {
                    return '<div style="border:1px solid #e2e8f0;border-radius:6px;margin-bottom:6px;overflow:hidden;background:'+rowBg+'">'
                        + '<div style="background:#1e3a5f;padding:5px 10px;display:flex;justify-content:space-between;align-items:center">'
                        +   '<span style="color:#fff;font-size:0.72rem;font-weight:700;text-transform:uppercase">'+f.materia+'</span>'
                        +   '<span style="color:rgba(255,255,255,0.7);font-size:0.6rem">I.H: '+ih+' &nbsp;—&nbsp; Aus: 0</span>'
                        + '</div>'
                        + '<div style="padding:8px 12px;display:flex;gap:20px;flex-wrap:wrap;font-size:0.68rem">'
                        +   _lv('PROM. NOTAS 60%', f.rd) + _lv('PROC-INTERMEDIOS', f.pi) + _lv('REC. o PROF.', f.pirp)
                        +   '<div style="margin-left:auto">'+notaFinalBadge(f.nota)+'</div>'
                        + '</div>'
                        + '</div>';
                }

                return '<div style="border:1px solid #e2e8f0;border-radius:6px;margin-bottom:6px;overflow:hidden">'

                    // ── FILA 1: Nombre + I.H / Aus ──
                    + '<div style="background:#1e3a5f;padding:6px 12px;display:flex;justify-content:space-between;align-items:center">'
                    +   '<span style="color:#fff;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.01em">'+f.materia+'</span>'
                    +   '<div style="display:flex;gap:12px">'
                    +     '<span style="color:rgba(255,255,255,0.7);font-size:0.6rem">I.H: <strong style="color:#fff">'+ih+'</strong></span>'
                    +     '<span style="color:rgba(255,255,255,0.7);font-size:0.6rem">Aus: <strong style="color:#fff">0</strong></span>'
                    +   '</div>'
                    + '</div>'

                    // ── FILA 2: Proceso (3 columnas) ──
                    + '<div style="display:grid;grid-template-columns:1fr 1px 1fr 1px 1fr;background:'+rowBg+'">'

                    //  Col A: Registro Diario (60%)
                    + '<div style="padding:8px 12px">'
                    +   '<div style="font-size:0.55rem;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px;padding-bottom:3px;border-bottom:2px solid #2563eb">Registro Diario (60%)</div>'
                    +   _lv('Prom. Notas', f.rd)
                    +   _lv('Credito 1 / 2', f.b1+' / '+f.b2)
                    +   _lv('Final 60%', f.ng60)
                    + '</div>'

                    // Separador
                    + '<div style="background:#e2e8f0"></div>'

                    //  Col B: Proceso Intermedio
                    + '<div style="padding:8px 12px">'
                    +   '<div style="font-size:0.55rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px;padding-bottom:3px;border-bottom:2px solid #7c3aed">Proceso Intermedio</div>'
                    +   _lv('Proc-Intermedios', f.pi)
                    +   _lv('Rec. o Prof.', f.pirp)
                    + '</div>'

                    // Separador
                    + '<div style="background:#e2e8f0"></div>'

                    //  Col C: Examen Final (40%)
                    + '<div style="padding:8px 12px">'
                    +   '<div style="font-size:0.55rem;font-weight:700;color:#0891b2;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px;padding-bottom:3px;border-bottom:2px solid #0891b2">Examen Final (40%)</div>'
                    +   _lv('Exa. Final', f.ef)
                    +   _lv('Rec. o Prof.', f.efrp)
                    +   _lv('Final 40%', f.ng40)
                    + '</div>'

                    + '</div>'

                    // ── FILA 3: Notas por periodo ──
                    + '<div style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:6px 12px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px">'
                    +   _pill('Nota Final P1', f.nfp1)
                    +   _pill('Nota Final P2', f.nfp2)
                    +   _pill('Nota Final P3', f.nfp3)
                    +   _pill('Acumulado General', f.acum)
                    + '</div>'

                    // ── FILA 4: Indicadores + Nota Final (todo horizontal) ──
                    + '<div style="background:'+rowBg+';border-top:1px solid #e2e8f0;padding:6px 12px;display:flex;align-items:center;gap:18px;flex-wrap:wrap">'
                    +   '<span style="font-size:0.58rem;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap">Indicador:</span>'
                    +   indBadge(f.indicador)
                    +   '<span style="width:1px;height:16px;background:#e2e8f0;display:inline-block"></span>'
                    +   _lv('N.M. Prox. Periodo', f.nmpp)
                    +   (f.cg11!=='0' ? _lv('Credito G11', f.cg11) : '')
                    +   '<div style="margin-left:auto;display:flex;align-items:center;gap:8px">'
                    +     '<span style="font-size:0.58rem;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap">Nota Final:</span>'
                    +     notaFinalBadge(f.nota)
                    +   '</div>'
                    + '</div>'

                    // ── LOGRO (si existe) ──
                    + (function() {
                        var logros = logrosMap[matKey] || [];
                        if (!logros.length) return '';
                        return '<div style="background:#f0f9ff;border-top:1px solid #bae6fd;padding:5px 12px">'
                            + '<span style="font-size:0.54rem;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.06em">Logro: </span>'
                            + logros.map(function(d){ return '<span style="font-size:0.63rem;color:#1e293b">'+d+'</span>'; }).join('<br>')
                            + '</div>';
                    })()

                    + '</div>';
            }).join('');


            var pageBreak = idx > 0 ? '<div style="page-break-before:always"></div>' : '';
            // Logo e institución dinámica desde _cfgEmpresa
            var _emp = window._cfgEmpresa || {};
            var _nombInst = _emp.nombre || 'Institución Educativa';
            var _logoSrc  = _emp.logo_boletin || _emp.logo || '';
            var _logoHTML = _logoSrc
                ? '<img src="' + _logoSrc + '" style="width:46px;height:46px;object-fit:contain;border-radius:6px">'
                : '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 13l10 6 10-6"/></svg>';

            return pageBreak
                // Header
                + '<div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:14px 20px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between">'
                +   '<div style="display:flex;align-items:center;gap:13px">'
                +     '<div style="width:50px;height:50px;background:rgba(255,255,255,0.15);border-radius:50%;border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden">'
                +       _logoHTML
                +     '</div>'
                +     '<div><div style="color:rgba(255,255,255,0.65);font-size:0.56rem;text-transform:uppercase;letter-spacing:0.12em">Institución Educativa</div>'
                +          '<div style="color:#fff;font-size:0.95rem;font-weight:700">' + _nombInst + '</div></div>'
                +   '</div>'
                +   '<div style="text-align:right">'
                +     '<div style="color:rgba(255,255,255,0.65);font-size:0.55rem;text-transform:uppercase;letter-spacing:0.12em">Informe Academico</div>'
                +     '<div style="color:#fff;font-size:0.9rem;font-weight:700">' + titulo + '</div>'
                +     '<div style="color:rgba(255,255,255,0.8);font-size:0.6rem;margin-top:2px">Periodo ' + periodo + '  |  ' + fecha + '  |  2026</div>'
                +   '</div>'
                + '</div>'
                // Estudiante
                + '<div style="border:1px solid #e2e8f0;border-top:none;padding:11px 20px;display:flex;align-items:center;gap:15px">'
                +   '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">' + fotoHTML + '</div>'
                +   '<div style="flex:1"><div style="font-size:0.55rem;color:#64748b;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:2px">Nombre del Estudiante</div>'
                +   '<div style="font-size:1rem;font-weight:700;color:#0f172a">' + nombre + '</div></div>'
                +   '<div style="display:flex;gap:7px">'
                +     _chip('Codigo', estId) + _chip('Curso', cursoNom) + _chip('Periodo', 'P'+periodo)
                +   '</div>'
                + '</div>'
                // Leyenda columnas
                + '<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;padding:5px 20px;margin-bottom:6px;display:flex;gap:16px">'
                +   '<span style="font-size:0.56rem;font-weight:700;color:#2563eb">■ Registro Diario (60%)</span>'
                +   '<span style="font-size:0.56rem;font-weight:700;color:#7c3aed">■ Proceso Intermedio</span>'
                +   '<span style="font-size:0.56rem;font-weight:700;color:#0891b2">■ Examen Final (40%)</span>'
                + '</div>'
                // Bloques
                + '<div style="padding:0 0 4px 0">' + bloquesHTML + '</div>'
                // Firmas
                + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin:10px 0">'
                + _firma('Rector') + _firma('Secretaria Academica') + _firma('Director de Grupo')
                + '</div>'
                // Footer
                + '<div style="border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between">'
                +   '<span style="font-size:0.56rem;color:#94a3b8">'+(estId?'Plataforma: CDLE-'+estId:'')+'</span>'
                +   '<span style="font-size:0.56rem;color:#94a3b8">Generado el '+fecha+(total?' | '+(idx+1)+' de '+total:'')+'</span>'
                + '</div>';
        }

        // sub-helpers (label+value)
        function _lv(label, val) {
            return '<div style="margin-bottom:3px">'
                + '<span style="font-size:0.58rem;color:#64748b">'+label+': </span>'
                + '<span style="font-size:0.68rem;font-weight:700;color:#1e293b">'+val+'</span>'
                + '</div>';
        }
        // pill para notas por periodo
        function _pill(label, val) {
            return '<div style="text-align:center;padding:3px 4px">'
                + '<div style="font-size:0.52rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">'+label+'</div>'
                + '<div style="font-size:0.75rem;font-weight:700;color:#1e3a5f">'+val+'</div>'
                + '</div>';
        }

        function _chip(l,v){ return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;text-align:center;min-width:72px"><div style="font-size:0.52rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">'+l+'</div><div style="font-size:0.72rem;font-weight:700;color:#1e3a5f">'+v+'</div></div>'; }
        function _firma(t){ return '<div style="text-align:center"><div style="border-bottom:1.5px solid #cbd5e1;height:40px;margin-bottom:3px"></div><div style="font-size:0.58rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em">'+t+'</div></div>'; }
        function _row2(l1,v1,l2,v2){
            return '<div style="display:flex;gap:6px;margin-bottom:3px;font-size:0.62rem;flex-wrap:wrap">'
                +'<span style="color:#64748b">'+l1+'</span><span style="font-weight:700;color:#1e293b;min-width:20px">'+v1+'</span>'
                +(l2?'<span style="color:#64748b;margin-left:6px">'+l2+'</span><span style="font-weight:700;color:#1e293b">'+v2+'</span>':'')
                +'</div>';
        }
        function _row3(l1,v1,l2,v2,l3,v3){
            return '<div style="display:flex;gap:4px;margin-bottom:3px;font-size:0.6rem;flex-wrap:wrap;align-items:center">'
                +'<span style="color:#64748b">'+l1+'</span><span style="font-weight:700;color:#1e293b;min-width:16px">'+v1+'</span>'
                +(l2?'<span style="color:#64748b;margin-left:4px">'+l2+'</span><span style="font-weight:700;color:#1e293b">'+v2+'</span>':'')
                +(l3?'<span style="color:#64748b;margin-left:4px">'+l3+'</span><span style="font-weight:700;color:#1e293b">'+v3+'</span>':'')
                +'</div>';
        }

        // -- GENERAR PDF: boletin intermedio CON LOGROS (boton Log) --
        async function generarPDFBoletinConLogros(tipo) {
            const prefixMap = { intermedio:'Int', periodo:'Per' };
            const prefix    = prefixMap[tipo] || 'Int';
            const container = document.getElementById('bol' + prefix + 'Resultado');
            if (!container || !container.innerHTML.trim() || container.innerHTML.includes('fa-spinner')) {
                alert('Primero genera el informe antes de exportar el PDF.');
                return;
            }

            // Contexto comun
            const cursoSel = document.getElementById('bol' + prefix + 'Curso');
            const perSel   = document.getElementById('bol' + prefix + 'Periodo');
            const cursoNom = cursoSel && cursoSel.selectedOptions[0] ? cursoSel.selectedOptions[0].textContent.trim() : '';
            const cursoId  = cursoSel ? cursoSel.value : '';
            const periodo  = perSel ? perSel.value : '';
            const hoy      = new Date();
            const fecha    = ('0'+hoy.getDate()).slice(-2)+'-'+('0'+(hoy.getMonth()+1)).slice(-2)+'-'+hoy.getFullYear();

            // Fetch logros (comun a ambos tipos)
            var logrosMap = {};
            try {
                const rl = await fetch(API + '/logros');
                const todos = await rl.json();
                todos.filter(function(l) {
                    return l.estado === 'A' && (!l.curso || l.curso.trim() === '' ||
                        l.curso.trim().toUpperCase() === cursoNom.toUpperCase() ||
                        cursoNom.toUpperCase().indexOf(l.curso.trim().toUpperCase()) >= 0);
                }).forEach(function(l) {
                    var key = (l.asignatura || '').trim().toUpperCase();
                    if (!logrosMap[key]) logrosMap[key] = [];
                    logrosMap[key].push(l.descripcion || '');
                });
            } catch(e) { console.warn('No se pudieron cargar los logros:', e); }

            // ── PERIODO: usa _buildPeriodoPage con logrosMap ──
            if (tipo === 'periodo') {
                var ihMap = {};
                try {
                    var rp = await fetch(API + '/pensum?curso=' + cursoId);
                    var ps = await rp.json();
                    ps.forEach(function(p) {
                        var nom = (p.asignatura_nombre || p.nombre || '').trim().toUpperCase();
                        if (nom) ihMap[nom] = p.intensidad || '-';
                    });
                } catch(e) { console.warn('No se pudo cargar pensum IH:', e); }

                const cards = Array.from(container.querySelectorAll('[style*="overflow:hidden"]'));
                if (!cards.length) { alert('No se encontraron registros.'); return; }
                const ctx = { cursoNom:cursoNom, periodo:periodo, fecha:fecha, titulo:'INFORME FINAL DE PERIODO + LOGROS' };
                const paginasHTML = cards.map(function(card, idx) {
                    return _buildPeriodoPage(card, ctx, idx, cards.length, ihMap, logrosMap);
                }).join('');
                var docPer = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
                    + '<title>Boletin Final con Logros - ' + cursoNom + '</title>'
                    + '<style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box;margin:0;padding:0}'
                    + 'body{font-family:"Segoe UI",Arial,sans-serif;background:#fff;color:#1e293b}'
                    + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>'
                    + '</head><body>' + paginasHTML
                    + '<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){window.print();},900);});</scr'+'ipt>'
                    + '</body></html>';
                var pwP = window.open('', '_blank', 'width=900,height=1100');
                if (!pwP) { alert('Permite ventanas emergentes para este sitio.'); return; }
                pwP.document.open(); pwP.document.write(docPer); pwP.document.close();
                return;
            }

            // ── INTERMEDIO con logros ──

            // Helpers
            function notaBadgeL(nota) {
                var n = parseFloat(nota)||0;
                if (n<60) return '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;border-radius:5px;padding:2px 8px;font-weight:700;font-size:0.76rem">'+nota+'</span>';
                if (n<70) return '<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:5px;padding:2px 8px;font-weight:700;font-size:0.76rem">'+nota+'</span>';
                return '<span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:5px;padding:2px 8px;font-weight:700;font-size:0.76rem">'+nota+'</span>';
            }

            const cards = Array.from(container.querySelectorAll('[style*="overflow:hidden"]'));
            if (!cards.length) { alert('No se encontraron registros.'); return; }

            var paginasHTML = cards.map(function(card, idx) {
                const nombreEl = card.querySelector('[style*="font-size:1rem"]');
                const nombre   = nombreEl ? nombreEl.textContent.trim().replace(/\s+/g,' ') : 'Estudiante';
                const pdfBtn   = card.querySelector('button[onclick*="generarPDFBoletin"]') ||
                                 card.querySelector('button[onclick*="Estudiante"]');
                var estId = '';
                if (pdfBtn) { var mm = pdfBtn.getAttribute('onclick').match(/'([^']+)'/); if (mm) estId = mm[1]; }
                const fotoEl   = card.querySelector('img');
                const fotoSrc  = fotoEl ? fotoEl.src : '';
                const fotoHTML = (fotoSrc && fotoSrc.indexOf('undefined') < 0 && fotoSrc.length > 10)
                    ? '<img src="' + fotoSrc + '" style="width:60px;height:60px;object-fit:cover;border-radius:50%;border:2px solid rgba(255,255,255,0.4)">'
                    : '<svg viewBox="0 0 80 80" width="60" height="60"><circle cx="40" cy="28" r="19" fill="rgba(255,255,255,0.5)"/><ellipse cx="40" cy="74" rx="30" ry="20" fill="rgba(255,255,255,0.5)"/></svg>';

                const filas = Array.from(card.querySelectorAll('tbody tr')).map(function(tr) {
                    const c = Array.from(tr.querySelectorAll('td'));
                    return { materia:c[0]?c[0].innerText.trim():'', rd:c[1]?c[1].innerText.trim():'0',
                             pi:c[3]?c[3].innerText.trim():'0', pirp:c[4]?c[4].innerText.trim():'0',
                             nota:c.length?c[c.length-1].innerText.trim():'0' };
                }).filter(function(f){ return f.materia; });

                // Tabla de notas + logros por asignatura
                const notasHTML = filas.map(function(f, i) {
                    const bg = i%2===0 ? '#f8fafc' : '#fff';
                    const matKey = f.materia.trim().toUpperCase();
                    const logros = logrosMap[matKey] || [];
                    const logroHTML = logros.length
                        ? '<div style="padding:4px 10px 6px 10px;background:#f0f9ff;border-top:1px solid #bae6fd">'
                          + '<span style="font-size:0.53rem;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.06em">Logro: </span>'
                          + logros.map(function(d){ return '<span style="font-size:0.62rem;color:#1e293b">'+d+'</span>'; }).join('<br>')
                          + '</div>'
                        : '';
                    return '<tr style="background:' + bg + '">'
                        + '<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:0.69rem;font-weight:600;color:#1e293b;text-transform:uppercase">' + f.materia + '</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:0.69rem;color:#64748b">1</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:0.69rem;color:#64748b">0</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:0.72rem;color:#334155">' + f.rd + '</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:0.72rem;color:#334155">' + f.pi + '</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:0.72rem;color:#334155">' + f.pirp + '</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center">' + notaBadgeL(f.nota) + '</td>'
                        + '</tr>'
                        + (logroHTML ? '<tr style="background:'+bg+'"><td colspan="7" style="padding:0;border-bottom:1px solid #e2e8f0">' + logroHTML + '</td></tr>' : '');
                }).join('');

                var pageBreak = idx > 0 ? '<div style="page-break-before:always"></div>' : '';
                var _emp2 = window._cfgEmpresa || {};
                var _nombInst2 = _emp2.nombre || 'Institución Educativa';
                var _logoSrc2  = _emp2.logo_boletin || _emp2.logo || '';
                var _logoHTML2 = _logoSrc2
                    ? '<img src="' + _logoSrc2 + '" style="width:46px;height:46px;object-fit:contain;border-radius:6px">'
                    : '<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 13l10 6 10-6"/></svg>';

                return pageBreak
                    + '<div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:14px 20px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between">'
                    +   '<div style="display:flex;align-items:center;gap:13px">'
                    +     '<div style="width:50px;height:50px;background:rgba(255,255,255,0.15);border-radius:50%;border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;overflow:hidden">'
                    +       _logoHTML2
                    +     '</div>'
                    +     '<div>'
                    +       '<div style="color:rgba(255,255,255,0.65);font-size:0.56rem;text-transform:uppercase;letter-spacing:0.12em">Institución Educativa</div>'
                    +       '<div style="color:#fff;font-size:0.95rem;font-weight:700">' + _nombInst2 + '</div>'
                    +     '</div>'
                    +   '</div>'
                    +   '<div style="text-align:right">'
                    +     '<div style="color:rgba(255,255,255,0.65);font-size:0.55rem;text-transform:uppercase;letter-spacing:0.12em">Informe Academico</div>'
                    +     '<div style="color:#fff;font-size:0.9rem;font-weight:700">PROCESOS INTERMEDIOS + LOGROS</div>'
                    +     '<div style="color:rgba(255,255,255,0.8);font-size:0.6rem;margin-top:2px">' + periodo + '  |  ' + fecha + '  |  2026</div>'
                    +   '</div>'
                    + '</div>'
                    + '<div style="border:1px solid #e2e8f0;border-top:none;padding:11px 20px;display:flex;align-items:center;gap:15px">'
                    +   '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">' + fotoHTML + '</div>'
                    +   '<div style="flex:1"><div style="font-size:0.55rem;color:#64748b;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:2px">Nombre del Estudiante</div>'
                    +   '<div style="font-size:1rem;font-weight:700;color:#0f172a">' + nombre + '</div></div>'
                    +   '<div style="display:flex;gap:7px">'
                    +     '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;text-align:center;min-width:72px"><div style="font-size:0.52rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Codigo</div><div style="font-size:0.72rem;font-weight:700;color:#1e3a5f">' + estId + '</div></div>'
                    +     '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;text-align:center;min-width:72px"><div style="font-size:0.52rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Curso</div><div style="font-size:0.72rem;font-weight:700;color:#1e3a5f">' + cursoNom + '</div></div>'
                    +     '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;text-align:center;min-width:72px"><div style="font-size:0.52rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Periodo</div><div style="font-size:0.72rem;font-weight:700;color:#1e3a5f">' + periodo + '</div></div>'
                    +   '</div>'
                    + '</div>'
                    + '<div style="border:1px solid #e2e8f0;border-top:none;overflow:hidden">'
                    +   '<table style="width:100%;border-collapse:collapse">'
                    +     '<thead><tr style="background:linear-gradient(135deg,#1e3a5f,#2563eb)">'
                    +       '<th style="color:#fff;padding:7px 10px;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:left;min-width:140px">Asignatura</th>'
                    +       '<th style="color:#fff;padding:7px 5px;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:center">I.H</th>'
                    +       '<th style="color:#fff;padding:7px 5px;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:center">Aus</th>'
                    +       '<th style="color:#fff;padding:7px 5px;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:center">R.D</th>'
                    +       '<th style="color:#fff;padding:7px 5px;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:center">P.I</th>'
                    +       '<th style="color:#fff;padding:7px 5px;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:center">R.P</th>'
                    +       '<th style="color:#fff;padding:7px 5px;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:center;background:rgba(255,255,255,0.15)">Nota</th>'
                    +     '</tr></thead>'
                    +     '<tbody>' + notasHTML + '</tbody>'
                    +   '</table>'
                    + '</div>'
                    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding:0 2px;margin:10px 0">'
                    +   '<div style="text-align:center"><div style="border-bottom:1.5px solid #cbd5e1;height:42px;margin-bottom:3px"></div><div style="font-size:0.58rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em">Rector</div></div>'
                    +   '<div style="text-align:center"><div style="border-bottom:1.5px solid #cbd5e1;height:42px;margin-bottom:3px"></div><div style="font-size:0.58rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em">Secretaria Academica</div></div>'
                    +   '<div style="text-align:center"><div style="border-bottom:1.5px solid #cbd5e1;height:42px;margin-bottom:3px"></div><div style="font-size:0.58rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em">Director de Grupo</div></div>'
                    + '</div>'
                    + '<div style="border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:flex-end">'
                    +   '<span style="font-size:0.56rem;color:#94a3b8">Generado el ' + fecha + ' | ' + (idx+1) + ' de ' + cards.length + '</span>'
                    + '</div>';
            }).join('');

            var doc = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
                + '<title>Boletin con Logros - ' + cursoNom + '</title>'
                + '<style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box;margin:0;padding:0}'
                + 'body{font-family:"Segoe UI",Arial,sans-serif;background:#fff;color:#1e293b}'
                + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>'
                + '</head><body>' + paginasHTML
                + '<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){window.print();},900);});</scr'+'ipt>'
                + '</body></html>';

            var pw = window.open('', '_blank', 'width=900,height=1100');
            if (!pw) { alert('Permite ventanas emergentes para este sitio.'); return; }
            pw.document.open(); pw.document.write(doc); pw.document.close();
        }

        // -- GENERAR PDF: informe completo del curso (una pagina por estudiante) --
        function generarPDFBoletin(tipo) {
            const prefixMap = { intermedio:'Int', periodo:'Per', cursoGlobal:'CG', cursoMateria:'CM', cursoRegDiario:'RD' };
            const prefix    = prefixMap[tipo] || 'Int';
            const container = document.getElementById('bol' + prefix + 'Resultado');
            if (!container || !container.innerHTML.trim() || container.innerHTML.includes('fa-spinner')) {
                alert('Primero genera el informe antes de exportar el PDF.');
                return;
            }

            // Contexto comun
            const cursoSel = document.getElementById('bol' + prefix + 'Curso');
            const perSel   = document.getElementById('bol' + prefix + 'Periodo');
            const cursoNom = cursoSel && cursoSel.selectedOptions[0] ? cursoSel.selectedOptions[0].textContent.trim() : '';
            const periodo  = perSel ? perSel.value : '1';
            const hoy      = new Date();
            const fecha    = ('0'+hoy.getDate()).slice(-2)+'-'+('0'+(hoy.getMonth()+1)).slice(-2)+'-'+hoy.getFullYear();
            const tituloMap = { intermedio:'PROCESOS INTERMEDIOS', periodo:'INFORME FINAL DE PERIODO',
                                cursoGlobal:'INFORME GLOBAL DEL CURSO', cursoMateria:'INFORME POR MATERIA', cursoRegDiario:'REGISTRO DIARIO' };
            const titulo   = tituloMap[tipo] || 'INFORME ACADEMICO';
            const ctx      = { cursoNom:cursoNom, periodo:periodo, fecha:fecha, titulo:titulo };

            // ── PERIODO: usa template _buildPeriodoPage (async para fetch pensum) ──
            if (tipo === 'periodo') {
                const cards = Array.from(container.querySelectorAll('[style*="overflow:hidden"]'));
                if (!cards.length) { alert('No se encontraron registros.'); return; }
                // Obtener cursoId del selector para fetch del pensum
                var cursoIdP = cursoSel ? cursoSel.value : '';
                (async function() {
                    var ihMap = {};
                    try {
                        var rp = await fetch(API + '/pensum?curso=' + cursoIdP);
                        var ps = await rp.json();
                        ps.forEach(function(p) {
                            var nom = (p.asignatura_nombre || p.nombre || '').trim().toUpperCase();
                            if (nom) ihMap[nom] = p.intensidad || '-';
                        });
                    } catch(e) { console.warn('No se pudo cargar pensum IH:', e); }
                    var paginasHTML = cards.map(function(card, idx) {
                        return _buildPeriodoPage(card, ctx, idx, cards.length, ihMap);
                    }).join('');
                    var docP = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
                        + '<title>Boletin Final - ' + cursoNom + '</title>'
                        + '<style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box;margin:0;padding:0}'
                        + 'body{font-family:"Segoe UI",Arial,sans-serif;background:#fff;color:#1e293b}'
                        + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>'
                        + '</head><body>' + paginasHTML
                        + '<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){window.print();},900);});</scr'+'ipt>'
                        + '</body></html>';
                    var pw = window.open('', '_blank', 'width=900,height=1100');
                    if (!pw) { alert('Permite ventanas emergentes para este sitio.'); return; }
                    pw.document.open(); pw.document.write(docP); pw.document.close();
                })();
                return;
            }

            // Helpers locales para el informe intermedio/otros tipos
            function infoChip(label, val) {
                return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;text-align:center;min-width:76px">'
                    + '<div style="font-size:0.53rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">' + label + '</div>'
                    + '<div style="font-size:0.75rem;font-weight:700;color:#1e3a5f">' + val + '</div>'
                    + '</div>';
            }
            function thCell(label, align, minW) {
                return '<th style="color:#fff;padding:7px '+(align==='left'?'10px':'5px')+';font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;text-align:'+align+(minW?';min-width:'+minW:'')+'">' + label + '</th>';
            }
            function firmaBlk(t) {
                return '<div style="text-align:center"><div style="border-bottom:1.5px solid #cbd5e1;height:42px;margin-bottom:3px"></div>'
                    + '<div style="font-size:0.58rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em">'+t+'</div></div>';
            }
            function notaBadge(nota) {
                var n = parseFloat(nota)||0;
                if (n<60) return '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;border-radius:5px;padding:2px 8px;font-weight:700;font-size:0.76rem">'+nota+'</span>';
                if (n<70) return '<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:5px;padding:2px 8px;font-weight:700;font-size:0.76rem">'+nota+'</span>';
                return '<span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:5px;padding:2px 8px;font-weight:700;font-size:0.76rem">'+nota+'</span>';
            }


            // Recopilar todos los cards de estudiante del resultado
            const cards = Array.from(container.querySelectorAll('[style*="overflow:hidden"]'));
            if (!cards.length) {
                alert('No se encontraron registros de estudiantes en el informe.');
                return;
            }

            // Generar una pagina HTML por cada estudiante
            var paginasHTML = cards.map(function(card, idx) {
                // Nombre
                const nombreEl = card.querySelector('[style*="font-size:1rem"]');
                const nombre   = nombreEl ? nombreEl.textContent.trim().replace(/\s+/g,' ') : 'Estudiante';

                // ID del estudiante (del onclick del boton pdf)
                const pdfBtn  = card.querySelector('button[onclick*="generarPDFBoletin"]') ||
                                 card.querySelector('button[onclick*="Estudiante"]');
                let estId = '';
                if (pdfBtn) {
                    const m = pdfBtn.getAttribute('onclick').match(/'([^']+)'/);
                    if (m) estId = m[1];
                }

                // Foto
                const fotoEl  = card.querySelector('img');
                const fotoSrc = fotoEl ? fotoEl.src : '';
                const fotoHTML = (fotoSrc && fotoSrc.indexOf('undefined') < 0 && fotoSrc.length > 10)
                    ? '<img src="' + fotoSrc + '" style="width:60px;height:60px;object-fit:cover;border-radius:50%;border:2px solid rgba(255,255,255,0.4)">'
                    : '<svg viewBox="0 0 80 80" width="60" height="60"><circle cx="40" cy="28" r="19" fill="rgba(255,255,255,0.5)"/><ellipse cx="40" cy="74" rx="30" ry="20" fill="rgba(255,255,255,0.5)"/></svg>';

                // Filas de la tabla
                const filas = Array.from(card.querySelectorAll('tbody tr')).map(function(tr) {
                    const c = Array.from(tr.querySelectorAll('td'));
                    return { materia:c[0]?c[0].innerText.trim():'', rd:c[1]?c[1].innerText.trim():'0',
                             pi:c[3]?c[3].innerText.trim():'0', pirp:c[4]?c[4].innerText.trim():'0',
                             nota:c.length?c[c.length-1].innerText.trim():'0' };
                }).filter(function(f){ return f.materia; });

                const notasHTML = filas.map(function(f, i) {
                    const bg = i%2===0 ? '#f8fafc' : '#fff';
                    return '<tr style="background:' + bg + '">'
                        + '<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:0.69rem;font-weight:600;color:#1e293b;text-transform:uppercase">' + f.materia + '</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:0.69rem;color:#64748b">1</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:0.69rem;color:#64748b">0</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:0.72rem;color:#334155">' + f.rd + '</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:0.72rem;color:#334155">' + f.pi + '</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;font-size:0.72rem;color:#334155">' + f.pirp + '</td>'
                        + '<td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:center">' + notaBadge(f.nota) + '</td>'
                        + '</tr>';
                }).join('');

                // Separador de pagina (excepto la primera)
                var pageBreak = idx > 0 ? '<div style="page-break-before:always"></div>' : '';

                return pageBreak
                    + (function() {
                        var _emp4 = window._cfgEmpresa || {};
                        var _n4 = _emp4.nombre || 'Institución Educativa';
                        var _ls4 = _emp4.logo_boletin || _emp4.logo || '';
                        var _lh4 = _ls4
                            ? '<img src="' + _ls4 + '" style="width:50px;height:50px;object-fit:contain;border-radius:6px">'
                            : '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 13l10 6 10-6"/></svg>';
                        return '<div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:16px 22px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between">'
                            +   '<div style="display:flex;align-items:center;gap:14px">'
                            +     '<div style="width:54px;height:54px;background:rgba(255,255,255,0.15);border-radius:50%;border:2px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;overflow:hidden">'
                            +       _lh4
                            +     '</div>'
                            +     '<div>'
                            +       '<div style="color:rgba(255,255,255,0.65);font-size:0.58rem;text-transform:uppercase;letter-spacing:0.12em">Institución Educativa</div>'
                            +       '<div style="color:#fff;font-size:1rem;font-weight:700;letter-spacing:0.01em">' + _n4 + '</div>'
                            +     '</div>'
                            +   '</div>'
                            +   '<div style="text-align:right">'
                            +     '<div style="color:rgba(255,255,255,0.65);font-size:0.56rem;text-transform:uppercase;letter-spacing:0.14em">Informe Académico</div>'
                            +     '<div style="color:#fff;font-size:0.95rem;font-weight:700">' + titulo + '</div>'
                            +     '<div style="color:rgba(255,255,255,0.8);font-size:0.62rem;margin-top:2px">Periodo ' + periodo + '  |  ' + fecha + '  |  2026</div>'
                            +   '</div>'
                            + '</div>';
                    })()
                    // Estudiante
                    + '<div style="border:1px solid #e2e8f0;border-top:none;padding:12px 20px;display:flex;align-items:center;gap:16px">'
                    +   '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">' + fotoHTML + '</div>'
                    +   '<div style="flex:1;min-width:0">'
                    +     '<div style="font-size:0.56rem;color:#64748b;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:2px">Nombre del Estudiante</div>'
                    +     '<div style="font-size:1rem;font-weight:700;color:#0f172a">' + nombre + '</div>'
                    +   '</div>'
                    +   '<div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end">'
                    +     (estId ? infoChip('Codigo', estId) : '') + infoChip('Curso', cursoNom) + infoChip('Periodo', 'P' + periodo)
                    +   '</div>'
                    + '</div>'
                    // Sub-label
                    + '<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;padding:5px 20px;margin-bottom:0">'
                    +   '<span style="font-size:0.58rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.1em">Registro de Desempeno por Dimension</span>'
                    + '</div>'
                    // Tabla
                    + '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'
                    + '<thead><tr style="background:#1e3a5f">'
                    + thCell('DIMENSION / ASIGNATURA','left','190px')
                    + thCell('IH','center','') + thCell('F','center','')
                    + thCell('PROM. REGISTROS','center','') + thCell('PROC-INTERM.','center','')
                    + thCell('REC/PROF.','center','') + thCell('NOTA FINAL','center','85px')
                    + '</tr></thead><tbody>' + notasHTML + '</tbody></table>'
                    // Firmas
                    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding:0 2px;margin-bottom:10px">'
                    + firmaBlk('Rector') + firmaBlk('Secretaria Academica') + firmaBlk('Director de Grupo')
                    + '</div>'
                    // Footer
                    + '<div style="border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between;margin-bottom:8px">'
                    +   '<span style="font-size:0.56rem;color:#94a3b8">' + (estId ? 'Plataforma: CDLE-' + estId : '') + '</span>'
                    +   '<span style="font-size:0.56rem;color:#94a3b8">Generado el ' + fecha + ' | ' + (idx+1) + ' de ' + cards.length + '</span>'
                    + '</div>';
            }).join('');

            // Construir documento completo
            var nombreArchivo = 'informe_' + tipo + '_' + cursoNom.replace(/\s+/g,'_') + '.pdf';
            var doc = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
                + '<title>' + nombreArchivo + '</title>'
                + '<style>'
                + '@page{size:A4 portrait;margin:10mm}'
                + '*{box-sizing:border-box;margin:0;padding:0}'
                + 'body{font-family:"Segoe UI",Arial,sans-serif;background:#fff;color:#1e293b}'
                + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
                + '</style></head><body>'
                + paginasHTML
                + '<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){window.print();},900);});</scr'+'ipt>'
                + '</body></html>';

            var pw = window.open('', '_blank', 'width=900,height=1100');
            if (!pw) { alert('Permite ventanas emergentes para este sitio.'); return; }
            pw.document.open();
            pw.document.write(doc);
            pw.document.close();
        }

        // -- GENERAR PDF: boletin individual (formato moderno) --
        function generarPDFBoletinEstudiante(estId) {

            // 1. Localizar el card y detectar contexto (periodo vs intermedio)
            const allResults = document.querySelectorAll('[id$="Resultado"]');
            let cardEl = null;
            let esPeriodoCtx = false;
            for (const r of allResults) {
                const btn = r.querySelector('button[onclick*="' + estId + '"]');
                if (btn) {
                    cardEl = btn.closest('[style*="overflow:hidden"]');
                    if (!cardEl) {
                        let el = btn.parentElement;
                        while (el && !el.querySelector('.table-container')) el = el.parentElement;
                        cardEl = el;
                    }
                    esPeriodoCtx = r.id === 'bolPerResultado';
                    break;
                }
            }
            if (!cardEl) { alert('No se encontro el boletin.'); return; }

            // Si es contexto de periodo, usar template de boletin final
            if (esPeriodoCtx) {
                const cursoSelP = document.getElementById('bolPerCurso');
                const perSelP   = document.getElementById('bolPerPeriodo');
                const ctxP = {
                    cursoNom: cursoSelP && cursoSelP.selectedOptions[0] ? cursoSelP.selectedOptions[0].textContent.trim() : '',
                    periodo:  perSelP ? perSelP.value : '1',
                    fecha:    (function(){ var h=new Date(); return ('0'+h.getDate()).slice(-2)+'-'+('0'+(h.getMonth()+1)).slice(-2)+'-'+h.getFullYear(); })(),
                    titulo:   'INFORME FINAL DE PERIODO'
                };
                var cursoIdEst = cursoSelP ? cursoSelP.value : '';
                var cardRef = cardEl; // captura para closure
                (async function() {
                    var ihMapE = {};
                    try {
                        var rpe = await fetch(API + '/pensum?curso=' + cursoIdEst);
                        var pse = await rpe.json();
                        pse.forEach(function(p) {
                            var nom = (p.asignatura_nombre || p.nombre || '').trim().toUpperCase();
                            if (nom) ihMapE[nom] = p.intensidad || '-';
                        });
                    } catch(e) { console.warn('No se pudo cargar pensum IH:', e); }
                    var pgHTML = _buildPeriodoPage(cardRef, ctxP, 0, null, ihMapE);
                    var docPer = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
                        + '<style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box;margin:0;padding:0}'
                        + 'body{font-family:"Segoe UI",Arial,sans-serif;background:#fff;color:#1e293b}'
                        + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>'
                        + '</head><body>' + pgHTML
                        + '<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){window.print();},800);});</scr'+'ipt>'
                        + '</body></html>';
                    var pw = window.open('', '_blank', 'width=900,height=1100');
                    if (!pw) { alert('Permite ventanas emergentes para este sitio.'); return; }
                    pw.document.open(); pw.document.write(docPer); pw.document.close();
                })();
                return;
            }

            // 2. Datos basicos
            const nombreEl = cardEl.querySelector('[style*="font-size:1rem"]');
            const nombre   = nombreEl ? nombreEl.textContent.trim().replace(/\s+/g,' ') : 'Estudiante ' + estId;
            const fotoEl   = cardEl.querySelector('img');
            const fotoSrc  = fotoEl ? fotoEl.src : '';

            // 3. Materias
            const filas = Array.from(cardEl.querySelectorAll('tbody tr')).map(function(tr) {
                const c = Array.from(tr.querySelectorAll('td'));
                return { materia:c[0]?c[0].innerText.trim():'', rd:c[1]?c[1].innerText.trim():'0',
                         pi:c[3]?c[3].innerText.trim():'0', pirp:c[4]?c[4].innerText.trim():'0',
                         nota:c.length?c[c.length-1].innerText.trim():'0' };
            }).filter(function(f){ return f.materia; });

            // 4. Contexto
            const cursoSel = document.getElementById('bolIntCurso') || document.getElementById('bolPerCurso');
            const perSel   = document.getElementById('bolIntPeriodo') || document.getElementById('bolPerPeriodo');
            const cursoNom = cursoSel && cursoSel.selectedOptions[0] ? cursoSel.selectedOptions[0].textContent.trim() : '';
            const periodo  = perSel ? perSel.value : '1';
            const hoy      = new Date();
            const fecha    = ('0'+hoy.getDate()).slice(-2)+'-'+('0'+(hoy.getMonth()+1)).slice(-2)+'-'+hoy.getFullYear();

            // 5. Foto / Avatar
            const fotoHTML = (fotoSrc && fotoSrc.indexOf('undefined') < 0 && fotoSrc.length > 10)
                ? '<img src="' + fotoSrc + '" style="width:64px;height:64px;object-fit:cover;border-radius:50%;border:2px solid rgba(255,255,255,0.4)">'
                : '<svg viewBox="0 0 80 80" width="64" height="64"><circle cx="40" cy="28" r="19" fill="rgba(255,255,255,0.5)"/><ellipse cx="40" cy="74" rx="30" ry="20" fill="rgba(255,255,255,0.5)"/></svg>';

            // 6. Filas de notas
            const notasHTML = filas.map(function(f, i) {
                const n = parseFloat(f.nota) || 0;
                const badge = n < 60
                    ? '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;border-radius:5px;padding:2px 9px;font-weight:700;font-size:0.78rem">' + f.nota + '</span>'
                    : n < 70
                    ? '<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:5px;padding:2px 9px;font-weight:700;font-size:0.78rem">' + f.nota + '</span>'
                    : '<span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:5px;padding:2px 9px;font-weight:700;font-size:0.78rem">' + f.nota + '</span>';
                const bg = i%2===0 ? '#f8fafc' : '#fff';
                return '<tr style="background:' + bg + '">'
                    + '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:0.71rem;font-weight:600;color:#1e293b;text-transform:uppercase">' + f.materia + '</td>'
                    + '<td style="padding:7px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:0.72rem;color:#64748b">1</td>'
                    + '<td style="padding:7px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:0.72rem;color:#64748b">0</td>'
                    + '<td style="padding:7px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;color:#334155">' + f.rd + '</td>'
                    + '<td style="padding:7px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;color:#334155">' + f.pi + '</td>'
                    + '<td style="padding:7px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;color:#334155">' + f.pirp + '</td>'
                    + '<td style="padding:7px;border-bottom:1px solid #e2e8f0;text-align:center">' + badge + '</td>'
                    + '</tr>';
            }).join('');

            // 7. Documento HTML
            const doc = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
                + '<title>Boletin - ' + nombre + '</title>'
                + '<style>'
                + '@page{size:A4 portrait;margin:12mm}'
                + '*{box-sizing:border-box;margin:0;padding:0}'
                + 'body{font-family:"Segoe UI",Arial,sans-serif;background:#fff;color:#1e293b}'
                + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
                + '</style></head><body>'

                // Header dinamico desde _cfgEmpresa
                + (function() {
                    var _e = window._cfgEmpresa || {};
                    var _n = _e.nombre || 'Institucion Educativa';
                    var _ls = _e.logo_boletin || _e.logo || '';
                    var _lh = _ls ? '<img src="' + _ls + '" style="width:50px;height:50px;object-fit:contain;border-radius:6px">' : '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.8"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 13l10 6 10-6"/></svg>';
                    return '<div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:16px 22px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between">' + '<div style="display:flex;align-items:center;gap:14px">' + '<div style="width:54px;height:54px;background:rgba(255,255,255,0.15);border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center">' + _lh + '</div>' + '<div><div style="color:rgba(255,255,255,0.65);font-size:0.58rem;text-transform:uppercase">Institucion Educativa</div><div style="color:#fff;font-size:1rem;font-weight:700">' + _n + '</div></div></div>';
                })()
                +   '<div style="text-align:right">'
                +     '<div style="color:rgba(255,255,255,0.65);font-size:0.56rem;text-transform:uppercase;letter-spacing:0.14em">Informe Academico</div>'
                +     '<div style="color:#fff;font-size:0.95rem;font-weight:700">PROCESOS INTERMEDIOS</div>'
                +     '<div style="color:rgba(255,255,255,0.8);font-size:0.62rem;margin-top:2px">Periodo ' + periodo + '  |  ' + fecha + '  |  2026</div>'
                +   '</div>'
                + '</div>'

                // Seccion estudiante
                + '<div style="border:1px solid #e2e8f0;border-top:none;padding:14px 22px;display:flex;align-items:center;gap:18px">'
                +   '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">' + fotoHTML + '</div>'
                +   '<div style="flex:1;min-width:0">'
                +     '<div style="font-size:0.58rem;color:#64748b;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:3px">Nombre del Estudiante</div>'
                +     '<div style="font-size:1.05rem;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + nombre + '</div>'
                +   '</div>'
                +   '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
                +     infoChip('Codigo', estId) + infoChip('Curso', cursoNom) + infoChip('Periodo', 'P' + periodo)
                +   '</div>'
                + '</div>'

                // Subtitulo tabla
                + '<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;padding:6px 22px;margin-bottom:0">'
                +   '<span style="font-size:0.6rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.1em">Registro de Desempeno por Dimension</span>'
                + '</div>'

                // Tabla
                + '<table style="width:100%;border-collapse:collapse;margin-bottom:18px">'
                + '<thead><tr style="background:#1e3a5f">'
                + thCell('DIMENSION / ASIGNATURA','left','200px')
                + thCell('IH','center','') + thCell('F','center','')
                + thCell('PROM. REGISTROS','center','') + thCell('PROC-INTERM.','center','')
                + thCell('REC/PROF.','center','') + thCell('NOTA FINAL','center','90px')
                + '</tr></thead><tbody>' + notasHTML + '</tbody></table>'

                // Firmas
                + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;padding:0 4px;margin-bottom:14px">'
                + firmaBlk('Rector') + firmaBlk('Secretaria Academica') + firmaBlk('Director de Grupo')
                + '</div>'

                // Footer
                + '<div style="border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between">'
                +   '<span style="font-size:0.58rem;color:#94a3b8">Plataforma: CDLE-' + estId + '</span>'
                +   '<span style="font-size:0.58rem;color:#94a3b8">Generado el ' + fecha + '</span>'
                + '</div>'

                + '<scr'+'ipt>window.addEventListener("load",function(){setTimeout(function(){window.print();},800);});</scr'+'ipt>'
                + '</body></html>';

            var pw = window.open('', '_blank', 'width=900,height=1100');
            if (!pw) { alert('Permite ventanas emergentes para este sitio.'); return; }
            pw.document.open();
            pw.document.write(doc);
            pw.document.close();
        }

        async function cargarMateriasCurso(cursoId) {
            const sel = document.getElementById('bolCMMateria');
            if (!sel) return;
            sel.innerHTML = '<option value="">Cargando...</option>';
            if (!cursoId) { sel.innerHTML = '<option value="">Seleccione Materia</option>'; return; }
            try {
                const res = await fetch(`${API}/pensum?curso=${cursoId}`);
                const pensums = await res.json();
                sel.innerHTML = '<option value="">Seleccione Materia</option>' +
                    pensums.map(p => `<option value="${p.subject_id}">${p.asignatura_nombre || p.nombre}</option>`).join('');
            } catch (e) { sel.innerHTML = '<option value="">Error cargando</option>'; }
        }

        // ── HORARIOS GENERALES ──
        let horarioEditId = null;

        async function cargarHorarios() {
            // Cargar cursos en el select
            const selectCurso = document.getElementById('selectGradoHorario');
            if (selectCurso.options.length <= 1) {
                try {
                    const cursosRes = await fetch(`${API}/cursos`);
                    const cursos = await cursosRes.json();
                    cursos.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.nombre || c.curso_id || '';
                        opt.textContent = c.nombre || c.curso_id || '—';
                        selectCurso.appendChild(opt);
                    });
                } catch (e) { }
            }
            const cursoFiltro = selectCurso.value;
            const url = cursoFiltro ? `${API}/horarios?curso=${encodeURIComponent(cursoFiltro)}` : `${API}/horarios`;
            const res = await fetch(url);
            const horarios = await res.json();
            const tbody = document.getElementById('horariosTbody');
            if (horarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--gray-400)">No hay horarios registrados</td></tr>';
                return;
            }
            tbody.innerHTML = horarios.map(h => `
                <tr>
                    <td>${h.curso || '—'}</td>
                    <td>${h.dia || '—'}</td>
                    <td>${h.hora || '—'}</td>
                    <td>${h.asignatura || '—'}</td>
                    <td>${h.docente || '—'}</td>
                    <td>${h.aula || '—'}</td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarHorario('${h._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarHorario('${h._id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function abrirNuevoHorario() {
            horarioEditId = null;
            document.getElementById('modalHorarioTitulo').innerHTML = '<i class="fas fa-calendar-alt"></i> Agregar Clase';
            document.getElementById('horCurso').value = '';
            document.getElementById('horDia').value = 'Lunes';
            document.getElementById('horHora').value = '';
            document.getElementById('horAsignatura').value = '';
            document.getElementById('horDocente').value = '';
            document.getElementById('horAula').value = '';
            document.getElementById('modalHorario').classList.add('show');
        }

        async function editarHorario(id) {
            const res = await fetch(`${API}/horarios`);
            const all = await res.json();
            const h = all.find(x => x._id === id);
            if (!h) { alert('Horario no encontrado'); return; }
            horarioEditId = id;
            document.getElementById('modalHorarioTitulo').innerHTML = '<i class="fas fa-edit"></i> Editar Clase';
            document.getElementById('horCurso').value = h.curso || '';
            document.getElementById('horDia').value = h.dia || 'Lunes';
            document.getElementById('horHora').value = h.hora || '';
            document.getElementById('horAsignatura').value = h.asignatura || '';
            document.getElementById('horDocente').value = h.docente || '';
            document.getElementById('horAula').value = h.aula || '';
            document.getElementById('modalHorario').classList.add('show');
        }

        async function guardarHorario() {
            const body = {
                curso: document.getElementById('horCurso').value.trim(),
                dia: document.getElementById('horDia').value,
                hora: document.getElementById('horHora').value.trim(),
                asignatura: document.getElementById('horAsignatura').value.trim(),
                docente: document.getElementById('horDocente').value.trim(),
                aula: document.getElementById('horAula').value.trim()
            };
            if (!body.curso || !body.dia || !body.hora) { alert('Curso, día y hora son obligatorios'); return; }
            const url = horarioEditId ? `${API}/horarios/${horarioEditId}` : `${API}/horarios`;
            const method = horarioEditId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                document.getElementById('modalHorario').classList.remove('show');
                await cargarHorarios();
            } else { const err = await res.json(); alert('Error: ' + (err.error || 'No se pudo guardar')); }
        }

        async function eliminarHorario(id) {
            if (!confirm('¿Eliminar este horario?')) return;
            const res = await fetch(`${API}/horarios/${id}`, { method: 'DELETE' });
            if (res.ok) await cargarHorarios();
            else alert('Error al eliminar');
        }

        // ── REPORTES ──
        async function cargarReportes() {
            try {
                const res = await fetch(`${API}/reportes/stats`);
                const s = await res.json();
                document.getElementById('repTasaAprobacion').textContent = s.tasaAprobacion + '%';
                document.getElementById('repEnRiesgo').textContent = s.enRiesgo;
                document.getElementById('repAsistencia').textContent = s.tasaAsistencia + '%';
                document.getElementById('repPagos').textContent = s.pagosPagados + '/' + (s.pagosPagados + s.pagosPendientes);

                const detalle = document.getElementById('reporteDetalle');
                detalle.innerHTML = `
                    <div class="user-item" style="flex-direction:column;gap:12px">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;width:100%">
                            <div style="padding:12px;border-radius:8px;background:rgba(16,185,129,0.1)">
                                <div style="font-size:0.85rem;color:var(--gray-500)"><i class="fas fa-users"></i> Total Estudiantes</div>
                                <div style="font-size:1.3rem;font-weight:700;color:var(--text-primary)">${s.totalEstudiantes}</div>
                            </div>
                            <div style="padding:12px;border-radius:8px;background:rgba(99,102,241,0.1)">
                                <div style="font-size:0.85rem;color:var(--gray-500)"><i class="fas fa-chalkboard-teacher"></i> Total Docentes</div>
                                <div style="font-size:1.3rem;font-weight:700;color:var(--text-primary)">${s.totalDocentes}</div>
                            </div>
                            <div style="padding:12px;border-radius:8px;background:rgba(245,158,11,0.1)">
                                <div style="font-size:0.85rem;color:var(--gray-500)"><i class="fas fa-book"></i> Total Cursos</div>
                                <div style="font-size:1.3rem;font-weight:700;color:var(--text-primary)">${s.totalCursos}</div>
                            </div>
                            <div style="padding:12px;border-radius:8px;background:rgba(239,68,68,0.1)">
                                <div style="font-size:0.85rem;color:var(--gray-500)"><i class="fas fa-eye"></i> Observaciones</div>
                                <div style="font-size:1.3rem;font-weight:700;color:var(--text-primary)">${s.obsRecientes}</div>
                            </div>
                        </div>
                        <div style="width:100%;margin-top:8px">
                            <h4 style="margin-bottom:8px;color:var(--text-primary)"><i class="fas fa-chart-pie"></i> Desglose de Calificaciones</h4>
                            <div style="display:flex;gap:12px;flex-wrap:wrap">
                                <span class="badge badge-success" style="font-size:0.9rem;padding:6px 14px">✅ Aprobados: ${s.aprobados}</span>
                                <span class="badge badge-danger" style="font-size:0.9rem;padding:6px 14px">❌ En riesgo: ${s.enRiesgo}</span>
                                <span class="badge badge-violet" style="font-size:0.9rem;padding:6px 14px">📝 Total calificaciones: ${s.totalCalif}</span>
                            </div>
                        </div>
                    </div>
                `;
            } catch (e) {
                document.getElementById('reporteDetalle').innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">Error cargando reportes</div>';
            }
        }

        // ── HORARIOS DE ATENCIÓN ──
        let hatEditId = null;

        async function cargarHorariosAtencion() {
            const res = await fetch(`${API}/horarios-atencion`);
            const horarios = await res.json();
            const sec = document.getElementById('secHorarioAtencion');
            const tbody = sec.querySelector('tbody');
            if (horarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--gray-400)">No hay horarios registrados</td></tr>';
                return;
            }
            tbody.innerHTML = horarios.map(h => `
                <tr>
                    <td>${h.docente || '—'}</td>
                    <td>${h.asignatura || '—'}</td>
                    <td>${h.dia || '—'}</td>
                    <td>${h.hora_inicio || '—'}</td>
                    <td>${h.hora_fin || '—'}</td>
                    <td>${h.lugar || '—'}</td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarHorarioAt('${h._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarHorarioAt('${h._id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function abrirNuevoHorarioAt() {
            hatEditId = null;
            document.getElementById('modalHorarioAtTitulo').innerHTML = '<i class="fas fa-clock"></i> Nuevo Horario';
            document.getElementById('hatDocente').value = '';
            document.getElementById('hatAsignatura').value = '';
            document.getElementById('hatDia').value = 'Lunes';
            document.getElementById('hatLugar').value = '';
            document.getElementById('hatHoraInicio').value = '14:00';
            document.getElementById('hatHoraFin').value = '15:00';
            document.getElementById('modalHorarioAt').classList.add('show');
        }

        async function editarHorarioAt(id) {
            const res = await fetch(`${API}/horarios-atencion/${id}`);
            const h = await res.json();
            hatEditId = id;
            document.getElementById('modalHorarioAtTitulo').innerHTML = '<i class="fas fa-edit"></i> Editar Horario';
            document.getElementById('hatDocente').value = h.docente || '';
            document.getElementById('hatAsignatura').value = h.asignatura || '';
            document.getElementById('hatDia').value = h.dia || 'Lunes';
            document.getElementById('hatLugar').value = h.lugar || '';
            document.getElementById('hatHoraInicio').value = h.hora_inicio || '14:00';
            document.getElementById('hatHoraFin').value = h.hora_fin || '15:00';
            document.getElementById('modalHorarioAt').classList.add('show');
        }

        async function guardarHorarioAt() {
            const body = {
                docente: document.getElementById('hatDocente').value.trim(),
                asignatura: document.getElementById('hatAsignatura').value.trim(),
                dia: document.getElementById('hatDia').value,
                lugar: document.getElementById('hatLugar').value.trim(),
                hora_inicio: document.getElementById('hatHoraInicio').value,
                hora_fin: document.getElementById('hatHoraFin').value
            };
            if (!body.docente || !body.dia) { alert('Docente y día son obligatorios'); return; }
            const url = hatEditId ? `${API}/horarios-atencion/${hatEditId}` : `${API}/horarios-atencion`;
            const method = hatEditId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                document.getElementById('modalHorarioAt').classList.remove('show');
                await cargarHorariosAtencion();
            } else { const err = await res.json(); alert('Error: ' + (err.error || 'No se pudo guardar')); }
        }

        async function eliminarHorarioAt(id) {
            if (!confirm('¿Eliminar este horario de atención?')) return;
            const res = await fetch(`${API}/horarios-atencion/${id}`, { method: 'DELETE' });
            if (res.ok) await cargarHorariosAtencion();
            else alert('Error al eliminar');
        }

        // ── PAGOS ──
        let pagoEditId = null;

        async function cargarPagos() {
            // Cargar stats
            try {
                const statsRes = await fetch(`${API}/pagos/stats`);
                const stats = await statsRes.json();
                document.getElementById('pagoRecaudado').textContent = '$' + (stats.recaudado || 0).toLocaleString();
                document.getElementById('pagoPendiente').textContent = '$' + (stats.pendienteCobro || 0).toLocaleString();
                document.getElementById('pagoPendientesCount').textContent = stats.pendientes || 0;
            } catch (e) { }
            // Cargar tabla
            const res = await fetch(`${API}/pagos`);
            const pagos = await res.json();
            const sec = document.getElementById('secPagos');
            const tbody = sec.querySelector('tbody');
            if (pagos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--gray-400)">No hay pagos registrados</td></tr>';
                return;
            }
            tbody.innerHTML = pagos.map(p => `
                <tr>
                    <td>${p.fecha || '—'}</td>
                    <td>${p.estudiante || '—'}</td>
                    <td>${p.concepto || '—'}</td>
                    <td>$${(parseFloat(p.valor) || 0).toLocaleString()}</td>
                    <td>${p.metodo || '—'}</td>
                    <td><span class="badge badge-${p.estado === 'Pagado' ? 'success' : p.estado === 'Vencido' ? 'danger' : 'warning'}">${p.estado || '—'}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-edit btn-sm" onclick="editarPago('${p._id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarPago('${p._id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function abrirNuevoPago() {
            pagoEditId = null;
            document.getElementById('modalPagoTitulo').innerHTML = '<i class="fas fa-money-bill-wave"></i> Registrar Pago';
            document.getElementById('pagoEstudiante').value = '';
            document.getElementById('pagoConcepto').value = '';
            document.getElementById('pagoValor').value = '';
            document.getElementById('pagoMetodo').value = 'Efectivo';
            document.getElementById('pagoFecha').value = new Date().toISOString().split('T')[0];
            document.getElementById('pagoEstadoSel').value = 'Pagado';
            document.getElementById('modalPago').classList.add('show');
        }

        async function editarPago(id) {
            const res = await fetch(`${API}/pagos`);
            const pagos = await res.json();
            const p = pagos.find(x => x._id === id);
            if (!p) { alert('Pago no encontrado'); return; }
            pagoEditId = id;
            document.getElementById('modalPagoTitulo').innerHTML = '<i class="fas fa-edit"></i> Editar Pago';
            document.getElementById('pagoEstudiante').value = p.estudiante || '';
            document.getElementById('pagoConcepto').value = p.concepto || '';
            document.getElementById('pagoValor').value = p.valor || '';
            document.getElementById('pagoMetodo').value = p.metodo || 'Efectivo';
            document.getElementById('pagoFecha').value = p.fecha || '';
            document.getElementById('pagoEstadoSel').value = p.estado || 'Pendiente';
            document.getElementById('modalPago').classList.add('show');
        }

        async function guardarPago() {
            const body = {
                estudiante: document.getElementById('pagoEstudiante').value.trim(),
                concepto: document.getElementById('pagoConcepto').value.trim(),
                valor: parseFloat(document.getElementById('pagoValor').value) || 0,
                metodo: document.getElementById('pagoMetodo').value,
                fecha: document.getElementById('pagoFecha').value,
                estado: document.getElementById('pagoEstadoSel').value
            };
            if (!body.estudiante || !body.concepto) { alert('Estudiante y concepto son obligatorios'); return; }
            const url = pagoEditId ? `${API}/pagos/${pagoEditId}` : `${API}/pagos`;
            const method = pagoEditId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                document.getElementById('modalPago').classList.remove('show');
                await cargarPagos();
            } else { const err = await res.json(); alert('Error: ' + (err.error || 'No se pudo guardar')); }
        }

        async function eliminarPago(id) {
            if (!confirm('¿Eliminar este registro de pago?')) return;
            const res = await fetch(`${API}/pagos/${id}`, { method: 'DELETE' });
            if (res.ok) await cargarPagos();
            else alert('Error al eliminar');
        }

        // ── ANUNCIOS ──
        let anuncioEditId = null;

        async function cargarAnuncios() {
            const res = await fetch(`${API}/anuncios`);
            const anuncios = await res.json();
            const lista = document.getElementById('anunciosLista');
            if (anuncios.length === 0) {
                lista.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400)"><i class="fas fa-bullhorn" style="font-size:2rem;display:block;margin-bottom:8px"></i>No hay anuncios registrados</div>';
                return;
            }
            const icons = ['fa-bullhorn', 'fa-calendar', 'fa-trophy', 'fa-flag', 'fa-bell'];
            const colors = ['var(--primary),#8B5CF6', 'var(--accent),#e5566f', 'var(--success),#059669', '#f59e0b,#d97706', '#3b82f6,#2563eb'];
            lista.innerHTML = anuncios.map((a, i) => `
                <div class="user-item" style="flex-direction:column;align-items:flex-start;gap:10px">
                    <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
                        <div style="display:flex;align-items:center;gap:12px">
                            <div class="user-item-avatar" style="background:linear-gradient(135deg,${colors[i % colors.length]});width:40px;height:40px">
                                <i class="fas ${icons[i % icons.length]}" style="color:white;font-size:0.9rem"></i>
                            </div>
                            <div>
                                <h4>${a.titulo || 'Sin título'}</h4>
                                <p style="color:var(--gray-500);font-size:0.8rem">Publicado: ${a.fecha || '—'} • Para: ${a.destinatarios || 'Todos'}</p>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px">
                            <span class="badge badge-${a.estado === 'Activo' ? 'success' : 'warning'}">${a.estado || 'Activo'}</span>
                            <button class="btn btn-edit btn-sm" onclick="editarAnuncio('${a._id}')" style="padding:4px 8px" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-delete btn-sm" onclick="eliminarAnuncio('${a._id}')" style="padding:4px 8px" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <p style="color:var(--gray-600);font-size:0.9rem;padding-left:52px">${a.contenido || ''}</p>
                </div>
            `).join('');
        }

        function abrirNuevoAnuncio() {
            anuncioEditId = null;
            document.getElementById('modalAnuncioTitulo').innerHTML = '<i class="fas fa-bullhorn"></i> Nuevo Anuncio';
            document.getElementById('anuncioTitulo').value = '';
            document.getElementById('anuncioContenido').value = '';
            document.getElementById('anuncioDestinatarios').value = 'Todos';
            document.getElementById('anuncioEstadoSel').value = 'Activo';
            document.getElementById('modalAnuncio').classList.add('show');
        }

        async function editarAnuncio(id) {
            const res = await fetch(`${API}/anuncios/${id}`);
            const a = await res.json();
            anuncioEditId = id;
            document.getElementById('modalAnuncioTitulo').innerHTML = '<i class="fas fa-edit"></i> Editar Anuncio';
            document.getElementById('anuncioTitulo').value = a.titulo || '';
            document.getElementById('anuncioContenido').value = a.contenido || '';
            document.getElementById('anuncioDestinatarios').value = a.destinatarios || 'Todos';
            document.getElementById('anuncioEstadoSel').value = a.estado || 'Activo';
            document.getElementById('modalAnuncio').classList.add('show');
        }

        async function guardarAnuncio() {
            const body = {
                titulo: document.getElementById('anuncioTitulo').value.trim(),
                contenido: document.getElementById('anuncioContenido').value.trim(),
                destinatarios: document.getElementById('anuncioDestinatarios').value,
                estado: document.getElementById('anuncioEstadoSel').value,
                fecha: new Date().toISOString().split('T')[0]
            };
            if (!body.titulo) { alert('El título es obligatorio'); return; }
            const url = anuncioEditId ? `${API}/anuncios/${anuncioEditId}` : `${API}/anuncios`;
            const method = anuncioEditId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                document.getElementById('modalAnuncio').classList.remove('show');
                await cargarAnuncios();
            } else { const err = await res.json(); alert('Error: ' + (err.error || 'No se pudo guardar')); }
        }

        async function eliminarAnuncio(id) {
            if (!confirm('¿Eliminar este anuncio?')) return;
            const res = await fetch(`${API}/anuncios/${id}`, { method: 'DELETE' });
            if (res.ok) await cargarAnuncios();
            else alert('Error al eliminar');
        }

        // ── CARGAR DASHBOARD AL INICIO ──
        cargarDatosSeccion('dashboard');

        // ── NOTIFICACIONES (Admin) ──
        let notifData = [];
        async function cargarNotificaciones() {
            try {
                const res = await fetch(`${API}/notificaciones`);
                notifData = await res.json();
                // Update bell dropdown
                const list = document.getElementById('notifList');
                const count = document.getElementById('notifCount');
                const bell = document.getElementById('bellBtn');
                if (!notifData.length) {
                    list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash"></i><br>Sin notificaciones</div>';
                    count.style.display = 'none';
                    bell.classList.remove('has-notif');
                } else {
                    count.textContent = notifData.length;
                    count.style.display = 'flex';
                    bell.classList.add('has-notif');
                    const iconMap = { noticia: 'fa-bullhorn', evento: 'fa-calendar-check', aviso: 'fa-exclamation-triangle' };
                    list.innerHTML = notifData.map(n => {
                        const ago = tiempoRelativo(n.fecha_creacion);
                        return `<div class="notif-item">
                            <div class="notif-item-icon ${n.tipo}"><i class="fas ${n.icono || iconMap[n.tipo] || 'fa-bell'}"></i></div>
                            <div class="notif-item-body">
                                <div class="notif-item-title">${n.titulo}</div>
                                <div class="notif-item-msg">${n.mensaje}</div>
                                <div class="notif-item-time">${ago}</div>
                            </div>
                        </div>`;
                    }).join('');
                }
                // Update admin management list
                renderNotifAdmin();
            } catch (err) { console.error('Error cargando notificaciones:', err); }
        }

        function renderNotifAdmin() {
            const container = document.getElementById('adminNotifList');
            if (!notifData.length) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400)"><i class="fas fa-bell-slash" style="font-size:2rem;margin-bottom:8px"></i><p>No hay notificaciones publicadas</p></div>';
                return;
            }
            const iconMap = { noticia: 'fa-bullhorn', evento: 'fa-calendar-check', aviso: 'fa-exclamation-triangle' };
            const tipoLabel = { noticia: 'Noticia', evento: 'Evento', aviso: 'Aviso' };
            const tipoBadge = { noticia: 'badge-violet', evento: 'badge-success', aviso: 'badge-warning' };
            container.innerHTML = notifData.map(n => `
                <div class="user-item">
                    <div class="user-item-info">
                        <div class="user-item-avatar" style="background:${n.tipo === 'evento' ? 'linear-gradient(135deg,#10b981,#059669)' : n.tipo === 'aviso' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,var(--primary),var(--accent))'}">
                            <i class="fas ${n.icono || iconMap[n.tipo] || 'fa-bell'}"></i>
                        </div>
                        <div class="user-item-details">
                            <h4>${n.titulo} <span class="badge ${tipoBadge[n.tipo] || 'badge-violet'}" style="font-size:0.65rem">${tipoLabel[n.tipo] || 'Noticia'}</span></h4>
                            <p>${n.mensaje.substring(0, 80)}${n.mensaje.length > 80 ? '...' : ''}</p>
                            <small style="color:var(--gray-400)">${tiempoRelativo(n.fecha_creacion)}</small>
                        </div>
                    </div>
                    <div class="user-item-actions">
                        <button class="btn btn-delete btn-sm" onclick="eliminarNotificacion('${n._id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }

        async function crearNotificacion() {
            const titulo = document.getElementById('notifTitulo').value.trim();
            const mensaje = document.getElementById('notifMensaje').value.trim();
            const tipo = document.getElementById('notifTipo').value;
            const icono = document.getElementById('notifIcono').value;
            if (!titulo || !mensaje) { alert('Complete título y mensaje'); return; }
            try {
                const res = await fetch(`${API}/admin/notificaciones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, mensaje, tipo, icono })
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('notifTitulo').value = '';
                    document.getElementById('notifMensaje').value = '';
                    cargarNotificaciones();
                } else { alert('Error: ' + (data.error || 'No se pudo crear')); }
            } catch (err) { alert('Error de conexión'); console.error(err); }
        }

        async function eliminarNotificacion(id) {
            if (!confirm('¿Eliminar esta notificación?')) return;
            try {
                const res = await fetch(`${API}/admin/notificaciones/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) cargarNotificaciones();
                else alert('Error al eliminar');
            } catch (err) { console.error(err); }
        }

        function tiempoRelativo(fecha) {
            const diff = Date.now() - new Date(fecha).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Justo ahora';
            if (mins < 60) return `Hace ${mins} min`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `Hace ${hrs}h`;
            const dias = Math.floor(hrs / 24);
            return `Hace ${dias}d`;
        }

        function toggleNotifDropdown() {
            document.getElementById('notifDropdown').classList.toggle('show');
        }
        document.addEventListener('click', e => {
            const bell = document.querySelector('.notif-bell');
            const dd = document.getElementById('notifDropdown');
            if (bell && dd && !bell.contains(e.target) && !dd.contains(e.target)) dd.classList.remove('show');
        });
        cargarNotificaciones();
        // =============================================
        // ⚙️ CONFIGURACIÓN AVANZADA — Funciones JS
        // =============================================

        // --- Datos en memoria ---
        window._cfgEmpresa = window._cfgEmpresa || {};
        let _cfgUsuariosSistema = [];
        let _cfgAccesoModulos = {};
        let _usuariosCargados = false;

        // Módulos configurables por rol
        const MODULOS_ACCESO = [
            { id: 'estudiantes', label: 'Estudiantes', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'profesores', label: 'Docentes', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'acudientes', label: 'Acudientes', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'asignaturas', label: 'Asignaturas', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'cursos', label: 'Cursos', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'calificaciones', label: 'Calificaciones', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'asistencia', label: 'Asistencia', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'observador', label: 'Observador', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'horarios', label: 'Horario General', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'horarioAtencion', label: 'Horario Atención', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'pagos', label: 'Pagos', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'boletines', label: 'Boletines', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'anuncios', label: 'Anuncios', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'logros', label: 'Logros', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'indicadores', label: 'Indicadores', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'pensum', label: 'Pensum', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
            { id: 'reportes', label: 'Reportes', roles: ['admin', 'profesor', 'estudiante', 'padre'] },
        ];

        // --- Tab switching ---
        function switchCfgTab(tab, btn) {
            document.querySelectorAll('.cfg-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.cfg-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('cfgTab-' + tab).classList.add('active');
            if (tab === 'usuarios' && !_usuariosCargados) cargarUsuariosSistema();
            if (tab === 'acceso') renderTablaAcceso();
            if (tab === 'sistema') cargarSistemaStats();
            if (tab === 'academico') renderFechasPeriodos();
        }

        // --- Inicialización global ---
        async function initConfigAvanzada() {
            try {
                const [empRes, accRes, aparRes, acaRes] = await Promise.all([
                    fetch(`${API}/empresa`),
                    fetch(`${API}/empresa/acceso-modulos`),
                    fetch(`${API}/empresa/apariencia`),
                    fetch(`${API}/empresa/academico-config`)
                ]);
                window._cfgEmpresa = await empRes.json() || {};
                _cfgAccesoModulos = await accRes.json() || {};
                const apariencia = await aparRes.json() || {};
                const academico = await acaRes.json() || {};

                // Rellenar Tab 1 — Institución
                ['Nombre','Nit','Direccion','Telefono','Email','Rector','Lema','Mision','Vision'].forEach(k => {
                    const el = document.getElementById('adv' + k);
                    if (el) el.value = window._cfgEmpresa[k.toLowerCase()] || window._cfgEmpresa[k] || '';
                });
                document.getElementById('advAnio').value = window._cfgEmpresa.anio || 2026;
                document.getElementById('advJornada').value = window._cfgEmpresa.jornada || 'Mañana';
                document.getElementById('advPeriodos').value = window._cfgEmpresa.periodos || '4';
                document.getElementById('advNotaMin').value = window._cfgEmpresa.nota_min || 1.0;
                document.getElementById('advNotaMax').value = window._cfgEmpresa.nota_max || 5.0;
                document.getElementById('advNotaAprobatoria').value = window._cfgEmpresa.nota_aprobatoria || 3.0;

                // Logos: guardar previews y sincronizar variables globales
                if (window._cfgEmpresa.logo) {
                    setLogoPreview('logo', window._cfgEmpresa.logo);
                    window._logo_logo = window._cfgEmpresa.logo; // inicializar con valor actual
                }
                if (window._cfgEmpresa.logo_boletin) {
                    setLogoPreview('logoBol', window._cfgEmpresa.logo_boletin);
                    window._logo_logoBol = window._cfgEmpresa.logo_boletin; // inicializar con valor actual
                }

                // Tab 4 — Apariencia
                if (apariencia.color_primario) {
                    document.getElementById('aparienciaColorPrimario').value = apariencia.color_primario;
                    document.getElementById('aparienciaColorPrimarioHex').value = apariencia.color_primario;
                }
                if (apariencia.color_secundario) {
                    document.getElementById('aparienciaColorSecundario').value = apariencia.color_secundario;
                    document.getElementById('aparienciaColorSecundarioHex').value = apariencia.color_secundario;
                }
                if (apariencia.color_accent) {
                    document.getElementById('aparienciaColorAccent').value = apariencia.color_accent;
                    document.getElementById('aparienciaColorAccentHex').value = apariencia.color_accent;
                }
                if (apariencia.fuente) document.getElementById('aparienciaFuente').value = apariencia.fuente;
                if (apariencia.tema) document.getElementById('aparienciaTema').value = apariencia.tema;
                if (apariencia.radius) document.getElementById('aparienciaRadius').value = apariencia.radius;

                // Tab 5 — Académico
                if (academico.escalas) {
                    academico.escalas.forEach((e, i) => {
                        if (i < 4) {
                            document.getElementById(`esc${i}_nombre`).value = e.nombre || '';
                            document.getElementById(`esc${i}_min`).value = e.min ?? '';
                            document.getElementById(`esc${i}_max`).value = e.max ?? '';
                            if (e.color) document.getElementById(`esc${i}_color`).value = e.color;
                        }
                    });
                }
                if (academico.periodos) {
                    window._cfgFechasPeriodos = academico.periodos;
                    renderFechasPeriodos();
                }

                // Aplicar apariencia al DOM
                aplicarApariencia(apariencia);

            } catch(err) { console.error('initConfigAvanzada:', err); }
        }

        // --- Logos ---
        function previewLogo(input, key) {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { alert('❌ El archivo supera 2MB'); return; }
            const reader = new FileReader();
            reader.onload = e => {
                window['_logo_' + key] = e.target.result;
                setLogoPreview(key, e.target.result);
            };
            reader.readAsDataURL(file);
        }
        function setLogoPreview(key, src) {
            const img = document.getElementById(key + 'Img');
            const placeholder = document.getElementById(key + 'Placeholder');
            if (img) { img.src = src; img.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
        }
        function eliminarLogo(key) {
            window['_logo_' + key] = null;
            const img = document.getElementById(key + 'Img');
            const placeholder = document.getElementById(key + 'Placeholder');
            if (img) { img.src = ''; img.style.display = 'none'; }
            if (placeholder) placeholder.style.display = 'block';
        }

        // --- Tab 1: Guardar Institución ---
        async function guardarInstitucion() {
            const body = {
                nombre: document.getElementById('advNombre').value.trim(),
                nit: document.getElementById('advNit').value.trim(),
                direccion: document.getElementById('advDireccion').value.trim(),
                telefono: document.getElementById('advTelefono').value.trim(),
                email: document.getElementById('advEmail').value.trim(),
                rector: document.getElementById('advRector').value.trim(),
                lema: document.getElementById('advLema').value.trim(),
                mision: document.getElementById('advMision').value.trim(),
                vision: document.getElementById('advVision').value.trim(),
                anio: parseInt(document.getElementById('advAnio').value) || 2026,
                jornada: document.getElementById('advJornada').value,
                periodos: document.getElementById('advPeriodos').value,
                nota_min: parseFloat(document.getElementById('advNotaMin').value) || 1.0,
                nota_max: parseFloat(document.getElementById('advNotaMax').value) || 5.0,
                nota_aprobatoria: parseFloat(document.getElementById('advNotaAprobatoria').value) || 3.0,
            };
            // Logo: enviar siempre el valor actual (nuevo upload o el existente en memoria)
            // null = el usuario lo eliminó explícitamente, undefined = no lo incluir
            if (window._logo_logo !== undefined) body.logo = window._logo_logo || '';
            if (window._logo_logoBol !== undefined) body.logo_boletin = window._logo_logoBol || '';
            const res = await fetch(`${API}/empresa`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) {
                // Actualizar _cfgEmpresa en memoria
                window._cfgEmpresa = window._cfgEmpresa || {};
                Object.assign(window._cfgEmpresa, body);
                mostrarToast('✅ Institución guardada correctamente', 'success');
                // Actualizar logo en sidebar si cambió
                const sidebarLogo = document.querySelector('.sidebar-logo');
                if (sidebarLogo) {
                    if (body.logo) {
                        sidebarLogo.innerHTML = `<img src="${body.logo}" style="width:100%;height:100%;object-fit:contain;" alt="Logo">`;
                        sidebarLogo.style.background = 'transparent';
                        sidebarLogo.style.boxShadow = 'none';
                    } else if (body.logo === '') {
                        sidebarLogo.innerHTML = `<i class="fas fa-graduation-cap"></i> EduGestión`;
                        sidebarLogo.style.background = 'var(--primary)';
                        sidebarLogo.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
                    }
                }
            } else mostrarToast('❌ ' + (data.error || 'Error al guardar'), 'error');
        }

        // --- Tab 2: Usuarios del sistema ---
        async function cargarUsuariosSistema() {
            _usuariosCargados = true;
            const res = await fetch(`${API}/usuarios-sistema`);
            _cfgUsuariosSistema = await res.json();
            renderTablaUsuarios();
        }
        function renderTablaUsuarios() {
            const levels = { A: '🛡️ Admin', D: '👨‍🏫 Docente', E: '🎓 Estudiante' };
            const tbody = document.getElementById('tbodyUsuariosSistema');
            tbody.innerHTML = _cfgUsuariosSistema.map(u => `
                <tr>
                    <td><code style="font-size:0.85rem">${u.cuenta || ''}</code></td>
                    <td>${u.name || u.nombre || ''}</td>
                    <td><span class="badge" style="background:var(--primary-light);color:var(--primary);font-size:0.78rem;padding:3px 8px;border-radius:6px">${levels[u.level] || u.level}</span></td>
                    <td><span class="badge" style="background:${u.estado==='A'?'#dcfce7':'#fee2e2'};color:${u.estado==='A'?'#16a34a':'#dc2626'};font-size:0.78rem;padding:3px 8px;border-radius:6px">${u.estado==='A'?'Activo':'Inactivo'}</span></td>
                    <td>
                        <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.8rem;margin-right:4px" onclick="editarUsuarioSistema('${u._id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.8rem;background:#fee2e2;color:#dc2626" onclick="eliminarUsuarioSistema('${u._id}','${(u.cuenta||'').replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gray-400)">Sin usuarios</td></tr>';
        }
        function abrirModalUsuario() {
            document.getElementById('modalUsuarioTitulo').innerHTML = '<i class="fas fa-user-plus" style="color:var(--primary)"></i> Nuevo Usuario';
            document.getElementById('usuarioSistemaEditId').value = '';
            ['us_cuenta','us_name','us_password'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('us_level').value = 'A';
            document.getElementById('us_estado').value = 'A';
            document.getElementById('us_cuenta').disabled = false;
            document.getElementById('us_pwd_hint').style.display = 'none';
            document.getElementById('modalUsuarioSistema').classList.add('show');
        }
        function editarUsuarioSistema(id) {
            const u = _cfgUsuariosSistema.find(x => x._id === id);
            if (!u) return;
            document.getElementById('modalUsuarioTitulo').innerHTML = '<i class="fas fa-user-edit" style="color:var(--primary)"></i> Editar Usuario';
            document.getElementById('usuarioSistemaEditId').value = id;
            document.getElementById('us_cuenta').value = u.cuenta || '';
            document.getElementById('us_cuenta').disabled = true;
            document.getElementById('us_name').value = u.name || u.nombre || '';
            document.getElementById('us_level').value = u.level || 'A';
            document.getElementById('us_estado').value = u.estado || 'A';
            document.getElementById('us_password').value = '';
            document.getElementById('us_pwd_hint').style.display = 'block';
            document.getElementById('modalUsuarioSistema').classList.add('show');
        }
        async function guardarUsuarioSistema() {
            const id = document.getElementById('usuarioSistemaEditId').value;
            const body = {
                cuenta: document.getElementById('us_cuenta').value.trim(),
                name: document.getElementById('us_name').value.trim(),
                level: document.getElementById('us_level').value,
                estado: document.getElementById('us_estado').value,
                password: document.getElementById('us_password').value,
            };
            if (!id && !body.password) { mostrarToast('❌ La contraseña es obligatoria para usuarios nuevos', 'error'); return; }
            const url = id ? `${API}/usuarios-sistema/${id}` : `${API}/usuarios-sistema`;
            const method = id ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success || data.usuario) {
                document.getElementById('modalUsuarioSistema').classList.remove('show');
                mostrarToast('✅ Usuario guardado', 'success');
                await cargarUsuariosSistema();
            } else { mostrarToast('❌ ' + (data.error || 'Error'), 'error'); }
        }
        async function eliminarUsuarioSistema(id, cuenta) {
            if (!confirm(`¿Eliminar el usuario "${cuenta}"? Esta acción no se puede deshacer.`)) return;
            const res = await fetch(`${API}/usuarios-sistema/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { mostrarToast('✅ Usuario eliminado', 'success'); await cargarUsuariosSistema(); }
            else mostrarToast('❌ ' + (data.error || 'Error'), 'error');
        }

        // --- Tab 3: Control de Acceso ---
        function renderTablaAcceso() {
            const tbody = document.getElementById('tbodyAcceso');
            tbody.innerHTML = MODULOS_ACCESO.map(m => {
                const rolesCells = ['admin','profesor','estudiante','padre'].map(rol => {
                    if (!m.roles.includes(rol)) return '<td style="text-align:center"><span style="color:var(--gray-300)">—</span></td>';
                    const checked = _cfgAccesoModulos[m.id] ? _cfgAccesoModulos[m.id].includes(rol) : m.roles.includes(rol);
                    return `<td style="text-align:center"><label class="toggle-switch"><input type="checkbox" id="acc_${m.id}_${rol}" ${checked ? 'checked' : ''}><span class="toggle-slider"></span></label></td>`;
                }).join('');
                return `<tr><td style="font-weight:500">${m.label}</td>${rolesCells}</tr>`;
            }).join('');
        }
        async function guardarAccesoModulos() {
            const result = {};
            MODULOS_ACCESO.forEach(m => {
                result[m.id] = ['admin','profesor','estudiante','padre'].filter(rol => {
                    const el = document.getElementById(`acc_${m.id}_${rol}`);
                    return el && el.checked;
                });
            });
            const res = await fetch(`${API}/empresa/acceso-modulos`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) });
            const data = await res.json();
            if (data.success) { _cfgAccesoModulos = result; mostrarToast('✅ Control de acceso guardado', 'success'); }
            else mostrarToast('❌ ' + (data.error || 'Error'), 'error');
        }

        // --- Tab 4: Apariencia ---
        function syncColor(inputId, value) {
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) document.getElementById(inputId).value = value;
        }
        document.getElementById('aparienciaColorPrimario').addEventListener('input', function() {
            document.getElementById('aparienciaColorPrimarioHex').value = this.value;
            document.documentElement.style.setProperty('--primary', this.value);
        });
        document.getElementById('aparienciaColorSecundario').addEventListener('input', function() {
            document.getElementById('aparienciaColorSecundarioHex').value = this.value;
        });
        document.getElementById('aparienciaColorAccent').addEventListener('input', function() {
            document.getElementById('aparienciaColorAccentHex').value = this.value;
            document.documentElement.style.setProperty('--accent', this.value);
        });
        document.getElementById('aparienciaRadius').addEventListener('change', function() {
            document.documentElement.style.setProperty('--radius', this.value);
        });
        function previewFuente(font) {
            const link = document.getElementById('customFontLink') || (() => {
                const l = document.createElement('link'); l.id = 'customFontLink'; l.rel = 'stylesheet';
                document.head.appendChild(l); return l;
            })();
            link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g,'+')}:wght@400;500;600;700&display=swap`;
            document.body.style.fontFamily = `'${font}', sans-serif`;
        }
        function aplicarApariencia(ap) {
            if (!ap) return;
            if (ap.color_primario) document.documentElement.style.setProperty('--primary', ap.color_primario);
            if (ap.color_secundario) document.documentElement.style.setProperty('--secondary', ap.color_secundario);
            if (ap.color_accent) document.documentElement.style.setProperty('--accent', ap.color_accent);
            if (ap.radius) document.documentElement.style.setProperty('--radius', ap.radius);
            if (ap.fuente) previewFuente(ap.fuente);
        }
        function resetApariencia() {
            document.getElementById('aparienciaColorPrimario').value = '#6C63FF';
            document.getElementById('aparienciaColorPrimarioHex').value = '#6C63FF';
            document.getElementById('aparienciaColorSecundario').value = '#8b5cf6';
            document.getElementById('aparienciaColorSecundarioHex').value = '#8b5cf6';
            document.getElementById('aparienciaColorAccent').value = '#FF6584';
            document.getElementById('aparienciaColorAccentHex').value = '#FF6584';
            document.getElementById('aparienciaFuente').value = 'Inter';
            document.getElementById('aparienciaRadius').value = '8px';
            document.getElementById('aparienciaTema').value = 'light';
            document.documentElement.style.setProperty('--primary', '#6C63FF');
            document.documentElement.style.setProperty('--accent', '#FF6584');
            document.documentElement.style.setProperty('--radius', '8px');
        }
        async function guardarApariencia() {
            const body = {
                color_primario: document.getElementById('aparienciaColorPrimario').value,
                color_secundario: document.getElementById('aparienciaColorSecundario').value,
                color_accent: document.getElementById('aparienciaColorAccent').value,
                fuente: document.getElementById('aparienciaFuente').value,
                tema: document.getElementById('aparienciaTema').value,
                radius: document.getElementById('aparienciaRadius').value,
            };
            const res = await fetch(`${API}/empresa/apariencia`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) mostrarToast('✅ Apariencia guardada y aplicada', 'success');
            else mostrarToast('❌ ' + (data.error || 'Error'), 'error');
        }

        // --- Tab 5: Académico ---
        function renderFechasPeriodos() {
            const grid = document.getElementById('gridFechasPeriodos');
            const periodos = parseInt(document.getElementById('advPeriodos')?.value || 4);
            const saved = window._cfgFechasPeriodos || {};
            grid.innerHTML = '';
            for (let p = 1; p <= periodos; p++) {
                grid.innerHTML += `
                <div class="form-group"><label class="form-label">Periodo ${p} — Inicio</label><input class="form-input" type="date" id="pFecha${p}Ini" value="${saved[`p${p}_inicio`]||''}"></div>
                <div class="form-group"><label class="form-label">Periodo ${p} — Fin</label><input class="form-input" type="date" id="pFecha${p}Fin" value="${saved[`p${p}_fin`]||''}"></div>`;
            }
        }
        async function guardarAcademicoConfig() {
            const escalas = [0,1,2,3].map(i => ({
                nombre: document.getElementById(`esc${i}_nombre`)?.value || '',
                min: parseFloat(document.getElementById(`esc${i}_min`)?.value) || 0,
                max: parseFloat(document.getElementById(`esc${i}_max`)?.value) || 0,
                color: document.getElementById(`esc${i}_color`)?.value || '#000000',
            }));
            const periodos = parseInt(document.getElementById('advPeriodos')?.value || 4);
            const periodosFechas = {};
            for (let p = 1; p <= periodos; p++) {
                periodosFechas[`p${p}_inicio`] = document.getElementById(`pFecha${p}Ini`)?.value || '';
                periodosFechas[`p${p}_fin`] = document.getElementById(`pFecha${p}Fin`)?.value || '';
            }
            const body = { escalas, periodos: periodosFechas };
            const res = await fetch(`${API}/empresa/academico-config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) mostrarToast('✅ Configuración académica guardada', 'success');
            else mostrarToast('❌ ' + (data.error || 'Error'), 'error');
        }

        // --- Tab 6: Sistema ---
        async function cargarSistemaStats() {
            try {
                const res = await fetch(`${API}/sistema/stats`);
                const data = await res.json();
                document.getElementById('statUsuarios').textContent = data.usuarios ?? '-';
                document.getElementById('statEstudiantes').textContent = data.estudiantes ?? '-';
                document.getElementById('statDocentes').textContent = data.docentes ?? '-';
                document.getElementById('statAcudientes').textContent = data.acudientes ?? '-';
                document.getElementById('statCursos').textContent = data.cursos ?? '-';
                document.getElementById('statAsignaturas').textContent = data.asignaturas ?? '-';
                if (data.fecha) document.getElementById('sistemaFecha').textContent = 'Última actualización: ' + new Date(data.fecha).toLocaleString('es-CO');
            } catch(e) { console.error('stats:', e); }
        }
        async function cambiarPassword() {
            const actual = document.getElementById('pwdActual').value;
            const nueva = document.getElementById('pwdNueva').value;
            const conf = document.getElementById('pwdConfirmar').value;
            if (!actual || !nueva) { mostrarToast('❌ Completa todos los campos', 'error'); return; }
            if (nueva !== conf) { mostrarToast('❌ Las contraseñas nuevas no coinciden', 'error'); return; }
            if (nueva.length < 6) { mostrarToast('❌ La contraseña debe tener al menos 6 caracteres', 'error'); return; }
            const user = JSON.parse(sessionStorage.getItem('eduGestionUser') || '{}');
            if (!user.id && !user._id) { mostrarToast('❌ No se encontró el usuario en sesión', 'error'); return; }
            const uid = user._id || user.id;
            const res = await fetch(`${API}/usuarios-sistema/${uid}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actual, nueva }) });
            const data = await res.json();
            if (data.success) {
                ['pwdActual','pwdNueva','pwdConfirmar'].forEach(id => document.getElementById(id).value = '');
                mostrarToast('✅ Contraseña actualizada correctamente', 'success');
            } else mostrarToast('❌ ' + (data.error || 'Error'), 'error');
        }
        async function exportarConfig() {
            try {
                const [empRes, aparRes, accRes, acaRes] = await Promise.all([
                    fetch(`${API}/empresa`), fetch(`${API}/empresa/apariencia`),
                    fetch(`${API}/empresa/acceso-modulos`), fetch(`${API}/empresa/academico-config`)
                ]);
                const exportData = {
                    fecha_exportacion: new Date().toISOString(),
                    empresa: await empRes.json(),
                    apariencia: await aparRes.json(),
                    acceso_modulos: await accRes.json(),
                    academico: await acaRes.json()
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `config_edugestion_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                mostrarToast('✅ Configuración exportada', 'success');
            } catch(e) { mostrarToast('❌ Error al exportar', 'error'); }
        }

        // --- Toast global ---
        function mostrarToast(msg, tipo = 'success') {
            let toast = document.getElementById('globalToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'globalToast';
                toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:12px;color:#fff;font-size:0.9rem;font-weight:500;z-index:9999;max-width:340px;box-shadow:0 8px 24px rgba(0,0,0,0.2);transition:opacity 0.3s,transform 0.3s;opacity:0;transform:translateY(16px)';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.background = tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#6366f1';
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
            clearTimeout(toast._t);
            toast._t = setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(16px)'; }, 3500);
        }


    
        // =============================================
        // 🏫 SEDES — Gestión y Selector Global
        // =============================================
        let _sedes = [];

        // ── Obtener sede activa desde sessionStorage ──
        function getSede() {
            try { return JSON.parse(sessionStorage.getItem('sedeActual') || 'null'); } catch { return null; }
        }
        function getSedeId() {
            const s = getSede();
            return (s && s._id) ? s._id : 'todas';
        }

        // ── Cambiar sede desde el selector del header ──
        async function cambiarSede(val) {
            if (val === 'todas') {
                sessionStorage.removeItem('sedeActual');
                document.getElementById('sedeSelect').style.borderColor = '';
            } else {
                const sede = _sedes.find(s => s._id === val);
                if (sede) {
                    sessionStorage.setItem('sedeActual', JSON.stringify(sede));
                    document.getElementById('sedeSelect').style.borderColor = sede.color || 'var(--primary)';
                }
            }
            const activeSection = document.querySelector('.nav-item.active');
            if (activeSection) {
                const onclick = activeSection.getAttribute('onclick') || '';
                const match = onclick.match(/mostrarSeccion\('([^']+)'/);
                if (match) await cargarDatosSeccion(match[1]);
            }
            mostrarToast(val === 'todas' ? '🌐 Viendo todas las sedes' : ('🏫 Sede: ' + (getSede()?.nombre || '')), 'info');
        }

        // ── Poblar selector de sedes en header ──
        async function cargarSedesEnHeader() {
            try {
                const res = await fetch(API + '/sedes/todas');
                _sedes = await res.json();
                const select = document.getElementById('sedeSelect');
                const wrap = document.getElementById('sedeSelectorWrap');
                select.innerHTML = '<option value="todas">🌐 Todas las sedes</option>';
                _sedes.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s._id;
                    opt.textContent = '🏫 ' + s.nombre;
                    select.appendChild(opt);
                });
                const sedeActual = getSede();
                if (sedeActual) { select.value = sedeActual._id; select.style.borderColor = sedeActual.color || 'var(--primary)'; }
                wrap.style.display = _sedes.length > 0 ? 'flex' : 'none';
            } catch(e) { console.warn('No se pudieron cargar sedes:', e.message); }
        }

        // ── Cargar y renderizar tabla de sedes ──
        async function cargarSedes() {
            try {
                const res = await fetch(API + '/sedes/todas');
                _sedes = await res.json();
                renderTablaSedes();
                renderSedesStats();
            } catch(e) { mostrarToast('❌ Error cargando sedes', 'error'); }
        }

        function renderTablaSedes() {
            const tbody = document.getElementById('tbodySedes');
            if (!_sedes.length) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:48px 16px">' +
                    '<i class="fas fa-map-marker-alt" style="font-size:2.5rem;color:var(--gray-300);display:block;margin-bottom:12px"></i>' +
                    '<span style="color:var(--gray-500);font-size:0.95rem">No hay sedes registradas.</span><br>' +
                    '<small style="color:var(--gray-400)">Crea la primera sede con el botón "Nueva Sede".</small>' +
                    '</td></tr>';
                return;
            }
            tbody.innerHTML = _sedes.map(s => {
                const color = s.color || '#6366f1';
                const activa = s.activa !== false;
                return '<tr>' +
                    '<td style="text-align:center"><span class="sede-color-dot" style="background:' + color + '"></span></td>' +
                    '<td><strong style="color:var(--gray-900)">' + s.nombre + '</strong></td>' +
                    '<td><code style="font-size:0.8rem;background:var(--gray-100);padding:2px 8px;border-radius:4px;color:var(--gray-600)">' + (s.codigo || '—') + '</code></td>' +
                    '<td>' + (s.direccion || '<span style="color:var(--gray-400)">—</span>') + '</td>' +
                    '<td>' + (s.telefono || '<span style="color:var(--gray-400)">—</span>') + '</td>' +
                    '<td>' + (s.rector_sede || '<span style="color:var(--gray-400)">—</span>') + '</td>' +
                    '<td><span class="badge ' + (activa ? 'badge-success' : 'badge-danger') + '">' + (activa ? 'Activa' : 'Inactiva') + '</span></td>' +
                    '<td><div class="actions">' +
                        '<button class="btn btn-sm btn-edit" title="Editar sede" onclick="editarSede(\'' + s._id + '\')"><i class="fas fa-edit"></i></button>' +
                        '<button class="btn btn-sm ' + (activa ? 'btn-delete' : 'btn-success') + '" title="' + (activa ? 'Desactivar' : 'Activar') + '" onclick="toggleSede(\'' + s._id + '\',' + activa + ')">' +
                            (activa ? '<i class="fas fa-ban"></i>' : '<i class="fas fa-check"></i>') +
                        '</button>' +
                    '</div></td>' +
                    '</tr>';
            }).join('');
        }

        async function renderSedesStats() {
            const grid = document.getElementById('sedesStatsGrid');
            if (!grid || !_sedes.length) return;
            const results = await Promise.allSettled(_sedes.map(s =>
                fetch(API + '/sedes/' + s._id + '/stats').then(r => r.json()).then(d => Object.assign({}, d, { sede: s }))
            ));
            grid.innerHTML = results.map(r => {
                if (r.status !== 'fulfilled') return '';
                const d = r.value;
                const color = d.sede.color || '#6366f1';
                return '<div class="stat-card" style="border-top:3px solid ' + color + '">' +
                    '<div class="stat-header"><div class="stat-icon" style="background:' + color + '22;color:' + color + '"><i class="fas fa-map-marker-alt"></i></div></div>' +
                    '<div class="stat-value" style="font-size:1rem;font-weight:700">' + d.sede.nombre + '</div>' +
                    '<div class="stat-label">' + (d.estudiantes || 0) + ' est · ' + (d.docentes || 0) + ' doc · ' + (d.cursos || 0) + ' cursos</div>' +
                    '</div>';
            }).join('');
        }

        // ── Modal Sede ──
        function abrirModalSede() {
            document.getElementById('modalSedeTitulo').innerHTML = '<i class="fas fa-map-marker-alt" style="color:var(--primary)"></i> Nueva Sede';
            document.getElementById('sedeEditId').value = '';
            ['sede_nombre','sede_codigo','sede_direccion','sede_telefono','sede_email','sede_rector'].forEach(id => { document.getElementById(id).value = ''; });
            document.getElementById('sede_color').value = '#6366f1';
            document.getElementById('sede_color_hex').value = '#6366f1';
            document.getElementById('sede_activa').value = 'true';
            document.getElementById('modalSede').classList.add('show');
        }

        function editarSede(id) {
            const s = _sedes.find(x => x._id === id);
            if (!s) return;
            document.getElementById('modalSedeTitulo').innerHTML = '<i class="fas fa-edit" style="color:var(--primary)"></i> Editar Sede';
            document.getElementById('sedeEditId').value = id;
            document.getElementById('sede_nombre').value = s.nombre || '';
            document.getElementById('sede_codigo').value = s.codigo || '';
            document.getElementById('sede_direccion').value = s.direccion || '';
            document.getElementById('sede_telefono').value = s.telefono || '';
            document.getElementById('sede_email').value = s.email || '';
            document.getElementById('sede_rector').value = s.rector_sede || '';
            const color = s.color || '#6366f1';
            document.getElementById('sede_color').value = color;
            document.getElementById('sede_color_hex').value = color;
            document.getElementById('sede_activa').value = s.activa !== false ? 'true' : 'false';
            document.getElementById('modalSede').classList.add('show');
        }

        async function guardarSede() {
            const id = document.getElementById('sedeEditId').value;
            const nombre = document.getElementById('sede_nombre').value.trim();
            if (!nombre) { mostrarToast('❌ El nombre es obligatorio', 'error'); return; }
            const body = {
                nombre,
                codigo: document.getElementById('sede_codigo').value.trim(),
                direccion: document.getElementById('sede_direccion').value.trim(),
                telefono: document.getElementById('sede_telefono').value.trim(),
                email: document.getElementById('sede_email').value.trim(),
                rector_sede: document.getElementById('sede_rector').value.trim(),
                color: document.getElementById('sede_color').value,
                activa: document.getElementById('sede_activa').value === 'true',
            };
            try {
                const url = id ? (API + '/sedes/' + id) : (API + '/sedes');
                const method = id ? 'PUT' : 'POST';
                const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await res.json();
                if (data.success || data.sede) {
                    document.getElementById('modalSede').classList.remove('show');
                    mostrarToast(id ? '✅ Sede actualizada' : '✅ Sede creada', 'success');
                    await cargarSedes();
                    await cargarSedesEnHeader();
                } else { mostrarToast('❌ ' + (data.error || 'Error al guardar'), 'error'); }
            } catch(e) { mostrarToast('❌ Error de conexión', 'error'); }
        }

        async function toggleSede(id, activa) {
            if (!confirm('¿Deseas ' + (activa ? 'desactivar' : 'activar') + ' esta sede?')) return;
            try {
                const res = await fetch(API + '/sedes/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activa: !activa })
                });
                const data = await res.json();
                if (data.success) {
                    mostrarToast('✅ Sede ' + (activa ? 'desactivada' : 'activada'), 'success');
                    await cargarSedes();
                    await cargarSedesEnHeader();
                } else { mostrarToast('❌ ' + (data.error || 'Error'), 'error'); }
            } catch(e) { mostrarToast('❌ Error de conexión', 'error'); }
        }

        // ── Interceptor fetch: inyectar sede_id automáticamente ──
        (function patchFetch() {
            const _orig = window.fetch.bind(window);
            // Rutas que NO deben recibir sede_id (son globales/institucionales)
            const SKIP_SEDE = ['/api/sedes', '/api/empresa', '/auth/login'];
            window.fetch = function(url, opts) {
                opts = opts || {};
                if (typeof url === 'string' && url.includes('/api/')) {
                    const skipInject = SKIP_SEDE.some(p => url.includes(p));
                    if (!skipInject) {
                        const sedeId = getSedeId();
                        const method = (opts.method || 'GET').toUpperCase();
                        if (sedeId !== 'todas') {
                            if (method === 'GET') {
                                url = url + (url.includes('?') ? '&' : '?') + 'sede_id=' + encodeURIComponent(sedeId);
                            } else if ((method === 'POST' || method === 'PUT') && opts.body) {
                                try {
                                    const b = JSON.parse(opts.body);
                                    if (!b.sede_id) { b.sede_id = sedeId; opts = Object.assign({}, opts, { body: JSON.stringify(b) }); }
                                } catch(e) { /* body no es JSON */ }
                            }
                        }
                    }
                }
                return _orig(url, opts);
            };
        })();

        // Cargar sedes en header al iniciar
        cargarSedesEnHeader();

        // Cargar apariencia global (colores, fuente, logo) — se ejecuta con JWT activo
        (async function cargarAparienciaGlobal() {
            try {
                const resApariencia = await fetch('/api/empresa/apariencia');
                if (resApariencia.ok) {
                    const ap = await resApariencia.json();
                    if (ap) {
                        if (ap.color_primario) document.documentElement.style.setProperty('--primary', ap.color_primario);
                        if (ap.color_secundario) document.documentElement.style.setProperty('--secondary', ap.color_secundario);
                        if (ap.color_accent) document.documentElement.style.setProperty('--accent', ap.color_accent);
                        if (ap.radius) document.documentElement.style.setProperty('--radius', ap.radius);
                        if (ap.fuente) {
                            const link = document.createElement('link'); link.rel = 'stylesheet';
                            link.href = `https://fonts.googleapis.com/css2?family=${ap.fuente.replace(/ /g,'+')}:wght@400;500;600;700&display=swap`;
                            document.head.appendChild(link);
                            document.body.style.fontFamily = `'${ap.fuente}', sans-serif`;
                        }
                    }
                }
                const resEmpresa = await fetch('/api/empresa');
                if (resEmpresa.ok) {
                    const emp = await resEmpresa.json();
                    if (emp && emp.logo) {
                        const sidebarLogo = document.querySelector('.sidebar-logo');
                        if (sidebarLogo) {
                            sidebarLogo.innerHTML = `<img src="${emp.logo}" style="width:100%;height:100%;object-fit:contain;" alt="Logo Institución">`;
                            sidebarLogo.style.background = 'transparent';
                            sidebarLogo.style.boxShadow = 'none';
                        }
                    }
                    // --- Control de Acceso Global ---
                    if (emp && emp.acceso_modulos) {
                        try {
                            const tokenStr = sessionStorage.getItem('eduGestionToken');
                            if (tokenStr) {
                                const rolActual = JSON.parse(atob(tokenStr.split('.')[1])).rol;
                                const accesos = emp.acceso_modulos;
                                const map = {
                                    'estudiantes': ['estudiantes'],
                                    'profesores': ['profesores'],
                                    'acudientes': ['acudientes'],
                                    'asignaturas': ['asignaturas'],
                                    'cursos': ['cursos'],
                                    'calificaciones': ['calificaciones'],
                                    'asistencia': ['asistencia'],
                                    'observador': ['observador'],
                                    'horarios': ['horarios', 'horario'],
                                    'horarioAtencion': ['horarioAtencion'],
                                    'pagos': ['pagos', 'cartera'],
                                    'boletines': ['boletines'],
                                    'anuncios': ['anuncios'],
                                    'logros': ['logros'],
                                    'indicadores': ['indicadores'],
                                    'pensum': ['pensum'],
                                    'reportes': ['reportes']
                                };
                                for (const modId in map) {
                                    const sections = map[modId];
                                    const isVisible = !accesos[modId] || accesos[modId].includes(rolActual);
                                    if (!isVisible) {
                                        sections.forEach(sec => {
                                            const btns = document.querySelectorAll(`button[onclick*="'${sec}'"]`);
                                            btns.forEach(btn => btn.style.display = 'none');
                                        });
                                    }
                                }
                            }
                        } catch(e) { console.error('Error aplicando control de acceso:', e); }
                    }

                }
            } catch(e) { console.error('Error cargando apariencia global:', e); }
        })();

    