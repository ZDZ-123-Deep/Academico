if (localStorage.getItem('darkMode') === 'true') document.documentElement.classList.add('dark-mode');
        const API = '/api';
        let dashData = null;

        // 🔒 JWT: Interceptor global de fetch
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
        // ── Session check ──
        const userData = JSON.parse(sessionStorage.getItem('eduGestionUser') || 'null');
        if (!userData || !userData.teacher_id) {
            console.warn('No hay sesión de profesor activa');
        }

        // ── UI Helpers ──
        function mostrarSeccion(id, btn) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            const map = { 
                dashboard: 'secDashboard', cursos: 'secCursos', calificaciones: 'secCalificaciones', 
                asistencia: 'secAsistencia', horario: 'secHorario', actividades: 'secActividades',
                observador: 'secObservador', anuncios: 'secAnuncios', estudiantes: 'secEstudiantes', 
                acudientes: 'secAcudientes', reportes: 'secReportes'
            };
            document.getElementById(map[id]).classList.add('active');
            if (btn) btn.classList.add('active');
            
            const titles = { 
                dashboard: 'Panel <span>Profesor</span>', cursos: 'Mis <span>Cursos</span>', 
                calificaciones: '<span>Calificaciones</span>', asistencia: 'Control de <span>Asistencia</span>', 
                horario: 'Mi <span>Horario</span>', actividades: '<span>Actividades</span>',
                observador: '<span>Observador</span>', anuncios: '<span>Anuncios</span>', 
                estudiantes: '<span>Estudiantes</span>', acudientes: '<span>Acudientes</span>', 
                reportes: '<span>Reportes</span>' 
            };
            document.getElementById('headerTitle').innerHTML = titles[id] || id;
            
            // Cargar datos si es necesario
            if (id === 'observador' && typeof cargarObservadorClean === 'function') cargarObservadorClean();
            if (id === 'anuncios' && typeof cargarAnunciosClean === 'function') cargarAnunciosClean();
            if (id === 'estudiantes' && typeof cargarEstudiantesClean === 'function') cargarEstudiantesClean();
            if (id === 'acudientes' && typeof cargarAcudientesClean === 'function') cargarAcudientesClean();
            if (id === 'reportes' && typeof cargarReportesClean === 'function') cargarReportesClean();

            if (window.innerWidth <= 768) closeSidebar();
        }
        
        function closeSidebar() { const sb = document.getElementById('sidebar'); const sbo = document.getElementById('sidebarOverlay'); if (sb) sb.classList.remove('open'); if (sbo) sbo.classList.remove('active'); }
        function toggleSidebar() { const sb = document.getElementById('sidebar'); const sbo = document.getElementById('sidebarOverlay'); if (sb) sb.classList.toggle('open'); if (sbo) sbo.classList.toggle('active'); }
        const dm = document.getElementById('darkModeToggle'); dm.checked = localStorage.getItem('darkMode') === 'true'; if (dm.checked) document.body.classList.add('dark-mode');
        function toggleDarkMode() { document.body.classList.toggle('dark-mode'); document.documentElement.classList.toggle('dark-mode'); localStorage.setItem('darkMode', dm.checked) }
        function confirmarLogout() { document.getElementById('logoutOverlay').classList.add('show'); document.getElementById('logoutModal').classList.add('show') }
        function cerrarLogout() { document.getElementById('logoutOverlay').classList.remove('show'); document.getElementById('logoutModal').classList.remove('show') }
        document.getElementById('logoutOverlay').addEventListener('click', cerrarLogout);

        // Set today's date for attendance
        document.getElementById('fechaAsistencia').value = new Date().toISOString().split('T')[0];

        function getInitials(nombre) {
            if (!nombre) return '??';
            return nombre.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').substring(0, 2).toUpperCase();
        }

        // ── Load professor dashboard ──
        async function cargarDatosProfesor() {
            const teacherId = userData?.teacher_id;
            if (!teacherId) {
                document.getElementById('userName').textContent = 'Profesor (sin sesión)';
                document.getElementById('userRole').textContent = 'Inicia sesión para ver tus datos';
                return;
            }

            try {
                const res = await fetch(`${API}/profesor/dashboard?teacher_id=${teacherId}`);
                dashData = await res.json();

                // Update header
                const nombre = dashData.docente?.nombre || userData.name || 'Profesor';
                document.getElementById('userName').textContent = nombre;
                document.getElementById('userRole').textContent = dashData.docente?.especialidad && dashData.docente.especialidad !== 'nn' ? dashData.docente.especialidad : `${dashData.totalMaterias} materias asignadas`;
                document.getElementById('userAvatar').textContent = getInitials(nombre);

                // Update stats
                document.getElementById('statCursos').textContent = dashData.totalCursos;
                document.getElementById('statEstudiantes').textContent = dashData.totalEstudiantes;
                document.getElementById('statMaterias').textContent = dashData.totalMaterias;

                renderCursos();
                renderListaMaterias();
                poblarDropdowns();
                renderChart();
                renderHorario();
                cargarTareasProf();
            } catch (err) {
                console.error('Error cargando datos del profesor:', err);
            }
        }

        // ── Render Mis Cursos (clickable → go to calificaciones) ──
        function renderCursos() {
            if (!dashData) return;
            const container = document.getElementById('secCursos');
            const colors = ['var(--primary)', 'var(--accent)', 'var(--success)', '#f59e0b', '#8B5CF6', '#06b6d4'];
            let html = '<div class="stats-grid">';
            dashData.cursos.forEach((c, i) => {
                const col = colors[i % colors.length];
                const firstPensum = c.materias[0]?.pensum_id || '';
                html += `<div class="stat-card" style="cursor:pointer;border-left:4px solid ${col}" onclick="irACalificaciones('${c.class_id}','${firstPensum}')">
                    <h3 style="font-weight:700;color:var(--gray-900);margin-bottom:8px">${c.curso_nombre}</h3>
                    <p style="color:var(--gray-500);font-size:0.85rem;margin-bottom:12px">
                        <i class="fas fa-users"></i> ${c.estudiantes} estudiantes •
                        <i class="fas fa-book"></i> ${c.materias.length} materia(s)
                    </p>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <span class="badge badge-violet">${c.curso_codigo}</span>
                        ${c.materias.map(m => `<span class="badge badge-success" style="font-size:0.7rem">${m.asignatura}</span>`).join('')}
                    </div>
                    <p style="color:var(--primary);font-size:0.75rem;margin-top:8px"><i class="fas fa-arrow-right"></i> Ver calificaciones</p>
                </div>`;
            });
            html += '</div>';
            container.innerHTML = html;
        }

        function irACalificaciones(classId, pensumId) {
            const btn = document.querySelectorAll('.nav-item')[2];
            mostrarSeccion('calificaciones', btn);
            const sel = document.getElementById('selCursoCalificaciones');
            for (let opt of sel.options) {
                if (opt.value.startsWith(classId + '_')) {
                    opt.selected = true;
                    break;
                }
            }
            onCursoCalChange();
        }

        // ── Calificaciones: Course change ──
        let currentRegistros = [];
        function onCursoCalChange() {
            const val = document.getElementById('selCursoCalificaciones').value;
            document.getElementById('selTipoNota').value = '';
            document.getElementById('selRegistro').innerHTML = '<option value="">Seleccione registro</option>';
            document.getElementById('tbodyCalificaciones').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400)">Seleccione tipo de registro</td></tr>';
            document.getElementById('btnCrearRegistro').style.display = val ? 'inline-flex' : 'none';
        }

        // ── Calificaciones: Type change → load registros ──
        async function onTipoNotaChange() {
            const cursoVal = document.getElementById('selCursoCalificaciones').value;
            const tipo = document.getElementById('selTipoNota').value;
            const selReg = document.getElementById('selRegistro');
            selReg.innerHTML = '<option value="">Cargando...</option>';
            if (!cursoVal || !tipo) { selReg.innerHTML = '<option value="">Seleccione registro</option>'; return; }

            const [classId, pensumId] = cursoVal.split('_');
            try {
                const res = await fetch(`${API}/profesor/registros?pensum_id=${pensumId}`);
                const registros = await res.json();
                // Filter by type
                currentRegistros = registros.filter(r => r.codigo === tipo);
                selReg.innerHTML = '<option value="">Seleccione registro</option>';
                if (!currentRegistros.length) {
                    selReg.innerHTML = '<option value="">Sin registros de este tipo</option>';
                    document.getElementById('tbodyCalificaciones').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400)">No hay registros de este tipo. Usa el botón "Crear Registro"</td></tr>';
                    return;
                }
                currentRegistros.forEach(r => {
                    selReg.innerHTML += `<option value="${r.id}">Registro ${r.registro} — ${r.concepto}</option>`;
                });
            } catch (err) { console.error('Error cargando registros:', err); }
        }

        // ── Calificaciones: Load grades for specific registro ──
        async function cargarNotasRegistro() {
            const cursoVal = document.getElementById('selCursoCalificaciones').value;
            const idNota = document.getElementById('selRegistro').value;
            if (!cursoVal || !idNota) return;

            const [classId, pensumId] = cursoVal.split('_');
            const tbody = document.getElementById('tbodyCalificaciones');
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400)"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

            try {
                const res = await fetch(`${API}/profesor/estudiantes?class_id=${classId}&pensum_id=${pensumId}`);
                const estudiantes = await res.json();
                if (!estudiantes.length) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400)">No hay estudiantes en este curso</td></tr>';
                    return;
                }

                // Filter grades to only show the selected id_nota
                tbody.innerHTML = estudiantes.map(e => {
                    const notaReg = e.notas.find(n => String(n.id_nota) === String(idNota));
                    const c1 = notaReg?.comp_1 || 0;
                    const c2 = notaReg?.comp_2 || 0;
                    const c3 = notaReg?.comp_3 || 0;
                    const nota = notaReg?.nota || 0;
                    return `<tr>
                        <td>${e.estudiante_id}</td>
                        <td>${e.nombre}</td>
                        <td style="text-align:center;font-weight:600;color:${colorNota(c1)}">${c1 || '—'}</td>
                        <td style="text-align:center;font-weight:600;color:${colorNota(c2)}">${c2 || '—'}</td>
                        <td style="text-align:center;font-weight:600;color:${colorNota(c3)}">${c3 || '—'}</td>
                        <td style="text-align:center"><strong style="color:${colorNota(nota)}">${nota || '—'}</strong></td>
                        <td>${badgeEstado(nota)}</td>
                    </tr>`;
                }).join('');
            } catch (err) { console.error('Error cargando notas:', err); }
        }

        // ── Create registro modal ──
        function abrirModalRegistro() {
            const tipo = document.getElementById('selTipoNota').value;
            if (tipo) document.getElementById('modalTipoRegistro').value = tipo;
            document.getElementById('modalConcepto').value = '';
            document.getElementById('modalRegistroOverlay').style.display = 'block';
            document.getElementById('modalRegistro').style.display = 'block';
        }
        function cerrarModalRegistro() {
            document.getElementById('modalRegistroOverlay').style.display = 'none';
            document.getElementById('modalRegistro').style.display = 'none';
        }
        document.getElementById('modalRegistroOverlay').addEventListener('click', cerrarModalRegistro);

        async function crearRegistro() {
            const cursoVal = document.getElementById('selCursoCalificaciones').value;
            if (!cursoVal) { alert('Seleccione un curso/materia primero'); return; }
            const [classId, pensumId] = cursoVal.split('_');
            const codigo = document.getElementById('modalTipoRegistro').value;
            const concepto = document.getElementById('modalConcepto').value.trim();
            if (!concepto) { alert('Ingrese un concepto o descripción'); return; }

            try {
                const res = await fetch(`${API}/profesor/registros`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pensum_id: pensumId, codigo, concepto })
                });
                const data = await res.json();
                if (data.success) {
                    cerrarModalRegistro();
                    // Set type selector and reload
                    document.getElementById('selTipoNota').value = codigo;
                    await onTipoNotaChange();
                    // Auto-select the new registro
                    const selReg = document.getElementById('selRegistro');
                    selReg.value = data.registro.id;
                    cargarNotasRegistro();
                } else {
                    alert('Error: ' + (data.error || 'No se pudo crear'));
                }
            } catch (err) { alert('Error de conexión'); console.error(err); }
        }

        // ── Asistencia: Load students ──
        async function cargarEstudiantesCurso(tipo) {
            const sel = document.getElementById('selCursoAsistencia');
            const classId = sel.value;
            if (!classId) return;
            try {
                const res = await fetch(`${API}/profesor/estudiantes?class_id=${classId}`);
                const estudiantes = await res.json();
                const tbody = document.getElementById('tbodyAsistencia');
                if (!estudiantes.length) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400)">No hay estudiantes en este curso</td></tr>';
                    return;
                }
                tbody.innerHTML = estudiantes.map((e, i) => `<tr>
                    <td>${e.estudiante_id}</td>
                    <td>${e.nombre}</td>
                    <td style="text-align:center"><input type="radio" name="a${i}" checked style="accent-color:var(--success)"></td>
                    <td style="text-align:center"><input type="radio" name="a${i}" style="accent-color:var(--danger)"></td>
                    <td style="text-align:center"><input type="radio" name="a${i}" style="accent-color:var(--warning)"></td>
                    <td><input class="form-input" placeholder="—" style="padding:6px 8px;font-size:0.85rem"></td>
                </tr>`).join('');
            } catch (err) { console.error('Error cargando estudiantes:', err); }
        }
        function renderListaMaterias() {
            if (!dashData) return;
            const container = document.getElementById('listaMaterias');
            const colors = ['#6C63FF', '#FF6584', '#10b981', '#f59e0b', '#8B5CF6', '#06b6d4', '#ec4899'];
            let html = '';
            dashData.materias.forEach((m, i) => {
                const col = colors[i % colors.length];
                html += `<div class="user-item">
                    <div class="user-item-info">
                        <div class="user-item-avatar" style="background:${col};width:36px;height:36px;font-size:0.7rem;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:10px">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="user-item-details">
                            <h4>${m.asignatura}</h4>
                            <p>${m.curso_nombre} (${m.curso_codigo}) • ${m.estudiantes} est.</p>
                        </div>
                    </div>
                    <span class="badge badge-violet" style="font-size:0.7rem">IH: ${m.int_horaria}h</span>
                </div>`;
            });
            container.innerHTML = html || '<p style="text-align:center;color:var(--gray-400);padding:20px">Sin materias asignadas</p>';
        }

        // ── Populate dropdowns ──
        function poblarDropdowns() {
            if (!dashData) return;
            const selCal = document.getElementById('selCursoCalificaciones');
            selCal.innerHTML = '<option value="">Seleccione curso/materia</option>';
            dashData.materias.forEach(m => {
                selCal.innerHTML += `<option value="${m.class_id}_${m.pensum_id}">${m.asignatura} - ${m.curso_nombre} (${m.curso_codigo})</option>`;
            });

            const selAsi = document.getElementById('selCursoAsistencia');
            selAsi.innerHTML = '<option value="">Seleccione curso</option>';
            dashData.cursos.forEach(c => {
                selAsi.innerHTML += `<option value="${c.class_id}">${c.curso_nombre} (${c.curso_codigo})</option>`;
            });
        }

        // ── Color scale for grades ──
        function colorNota(n) { n = parseFloat(n); if (isNaN(n) || n === 0) return 'var(--gray-400)'; if (n >= 95) return '#27ae60'; if (n >= 80) return '#2980b9'; if (n >= 70) return '#e6a817'; return '#e74c3c'; }
        function badgeEstado(nota) {
            if (!nota || nota === 0) return '<span class="badge badge-violet">Pendiente</span>';
            if (nota >= 70) return '<span class="badge badge-success">Aprobó</span>';
            return '<span class="badge badge-danger">En riesgo</span>';
        }

        // ── Load students for calificaciones / asistencia ──
        async function cargarEstudiantesCurso(tipo) {
            const sel = tipo === 'calificaciones' ? document.getElementById('selCursoCalificaciones') : document.getElementById('selCursoAsistencia');
            const rawVal = sel.value;
            if (!rawVal) return;

            try {
                let url;
                if (tipo === 'calificaciones') {
                    const [classId, pensumId] = rawVal.split('_');
                    url = `${API}/profesor/estudiantes?class_id=${classId}&pensum_id=${pensumId}`;
                } else {
                    url = `${API}/profesor/estudiantes?class_id=${rawVal}`;
                }

                const res = await fetch(url);
                const estudiantes = await res.json();

                if (tipo === 'calificaciones') {
                    const tbody = document.getElementById('tbodyCalificaciones');
                    if (!estudiantes.length) {
                        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400)">No hay estudiantes en este curso</td></tr>';
                        return;
                    }
                    tbody.innerHTML = estudiantes.map(e => {
                        const n1 = e.notas[0]?.nota || 0;
                        const n2 = e.notas[1]?.nota || 0;
                        const n3 = e.notas[2]?.nota || 0;
                        const count = (n1 > 0 ? 1 : 0) + (n2 > 0 ? 1 : 0) + (n3 > 0 ? 1 : 0);
                        const def = count > 0 ? Math.round((n1 + n2 + n3) / count) : 0;
                        return `<tr>
                            <td>${e.estudiante_id}</td>
                            <td>${e.nombre}</td>
                            <td style="text-align:center;font-weight:600;color:${colorNota(n1)}">${n1 || '—'}</td>
                            <td style="text-align:center;font-weight:600;color:${colorNota(n2)}">${n2 || '—'}</td>
                            <td style="text-align:center;font-weight:600;color:${colorNota(n3)}">${n3 || '—'}</td>
                            <td style="text-align:center"><strong style="color:${colorNota(def)}">${def || '—'}</strong></td>
                            <td>${badgeEstado(def)}</td>
                        </tr>`;
                    }).join('');
                } else {
                    const tbody = document.getElementById('tbodyAsistencia');
                    if (!estudiantes.length) {
                        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400)">No hay estudiantes en este curso</td></tr>';
                        return;
                    }
                    tbody.innerHTML = estudiantes.map((e, i) => `<tr>
                        <td>${e.estudiante_id}</td>
                        <td>${e.nombre}</td>
                        <td style="text-align:center"><input type="radio" name="a${i}" checked style="accent-color:var(--success)"></td>
                        <td style="text-align:center"><input type="radio" name="a${i}" style="accent-color:var(--danger)"></td>
                        <td style="text-align:center"><input type="radio" name="a${i}" style="accent-color:var(--warning)"></td>
                        <td><input class="form-input" placeholder="—" style="padding:6px 8px;font-size:0.85rem"></td>
                    </tr>`).join('');
                }
            } catch (err) {
                console.error('Error cargando estudiantes:', err);
            }
        }

        // ── Render chart ──
        function renderChart() {
            if (!dashData || !dashData.cursos.length) return;
            const ctx = document.getElementById('chartCursos');
            if (!ctx) return;
            const labels = dashData.cursos.map(c => c.curso_codigo);
            const data = dashData.cursos.map(c => c.estudiantes);
            const bgColors = ['#6C63FF', '#FF6584', '#10b981', '#f59e0b', '#3b82f6', '#8B5CF6', '#ec4899'];
            new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: bgColors.slice(0, labels.length), borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
            });
        }

        // ── Render horario ──
        function renderHorario() {
            if (!dashData) return;
            const container = document.getElementById('contenidoHorario');
            const horas = ['7:00 - 8:00', '8:00 - 9:00', '9:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '12:00 - 1:00'];
            const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

            let html = '<div class="table-container"><table class="data-table"><thead><tr><th>Hora</th>';
            dias.forEach(d => { html += `<th>${d}</th>`; });
            html += '</tr></thead><tbody>';

            // Distribute materias across schedule
            const cells = {};
            let idx = 0;
            dashData.materias.forEach(m => {
                const ih = parseInt(m.int_horaria) || 1;
                for (let h = 0; h < ih && idx < horas.length * dias.length; h++) {
                    const dia = idx % dias.length;
                    const hora = Math.floor(idx / dias.length);
                    const key = `${hora}_${dia}`;
                    cells[key] = { asignatura: m.asignatura, curso: m.curso_codigo };
                    idx++;
                }
            });

            horas.forEach((h, hi) => {
                html += `<tr><td><strong>${h}</strong></td>`;
                dias.forEach((d, di) => {
                    const key = `${hi}_${di}`;
                    if (cells[key]) {
                        html += `<td><div style="background:var(--primary-light, rgba(108,99,255,0.1));padding:8px;border-radius:8px;font-size:0.8rem">
                            <strong>${cells[key].asignatura}</strong><br><small style="color:var(--gray-500)">${cells[key].curso}</small>
                        </div></td>`;
                    } else {
                        html += '<td style="text-align:center;color:var(--gray-300)">—</td>';
                    }
                });
                html += '</tr>';
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;
        }

        // ── Init ──
        cargarDatosProfesor();

        // ── TAREAS / ACTIVIDADES ──
        async function cargarTareasProf() {
            const teacherId = userData?.teacher_id;
            if (!teacherId) return;
            try {
                const res = await fetch(`${API}/profesor/tareas?teacher_id=${teacherId}`);
                const tareas = await res.json();
                const tbody = document.getElementById('tbodyTareasProf');
                if (!tareas.length) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400)">No has creado actividades aún</td></tr>';
                    return;
                }
                tbody.innerHTML = tareas.map(t => {
                    const limite = new Date(t.fecha_limite);
                    const now = new Date();
                    const vencida = now > limite;
                    return `<tr>
                        <td><span class="badge badge-violet" style="font-size:0.75rem">${t.asignatura}</span></td>
                        <td><strong>${t.titulo}</strong></td>
                        <td style="color:${vencida ? '#ef4444' : 'var(--gray-400)'}">${limite.toLocaleDateString('es-CO')} ${limite.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>${t.permite_tardia ? '<span class="badge badge-warning" style="font-size:0.7rem">Sí</span>' : '<span class="badge badge-danger" style="font-size:0.7rem">No</span>'}</td>
                        <td style="text-align:center"><strong>${t.entregas}</strong></td>
                        <td><button class="btn btn-primary" style="padding:4px 10px;font-size:0.8rem" onclick="verEntregas('${t._id}')"><i class="fas fa-eye"></i> Entregas</button></td>
                    </tr>`;
                }).join('');
            } catch (err) { console.error('Error cargando tareas:', err); }
        }

        function abrirModalTarea() {
            const sel = document.getElementById('tareaMateria');
            sel.innerHTML = '<option value="">Seleccione materia</option>';
            if (dashData) {
                dashData.materias.forEach(m => {
                    sel.innerHTML += `<option value="${m.pensum_id}" data-class="${m.class_id}">${m.asignatura} - ${m.curso_nombre} (${m.curso_codigo})</option>`;
                });
            }
            document.getElementById('tareaTitulo').value = '';
            document.getElementById('tareaDescripcion').value = '';
            document.getElementById('tareaFechaLimite').value = '';
            document.getElementById('tareaPermiteTardia').checked = false;
            document.getElementById('modalTareaOverlay').style.display = 'block';
            document.getElementById('modalTarea').style.display = 'block';
        }
        function cerrarModalTarea() {
            document.getElementById('modalTareaOverlay').style.display = 'none';
            document.getElementById('modalTarea').style.display = 'none';
        }
        document.getElementById('modalTareaOverlay').addEventListener('click', cerrarModalTarea);

        async function crearTarea() {
            const pensumId = document.getElementById('tareaMateria').value;
            const selOpt = document.getElementById('tareaMateria').selectedOptions[0];
            const classId = selOpt?.dataset?.class || '';
            const titulo = document.getElementById('tareaTitulo').value.trim();
            const descripcion = document.getElementById('tareaDescripcion').value.trim();
            const fechaLimite = document.getElementById('tareaFechaLimite').value;
            const permiteTardia = document.getElementById('tareaPermiteTardia').checked;

            if (!pensumId || !titulo || !fechaLimite) { alert('Complete materia, título y fecha límite'); return; }

            try {
                const res = await fetch(`${API}/profesor/tareas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teacher_id: userData.teacher_id, pensum_id: pensumId, class_id: classId, titulo, descripcion, fecha_limite: fechaLimite, permite_tardia: permiteTardia })
                });
                const data = await res.json();
                if (data.success) {
                    cerrarModalTarea();
                    cargarTareasProf();
                } else { alert('Error: ' + (data.error || 'No se pudo crear')); }
            } catch (err) { alert('Error de conexión'); console.error(err); }
        }

        async function verEntregas(tareaId) {
            document.getElementById('modalEntregasOverlay').style.display = 'block';
            document.getElementById('modalEntregas').style.display = 'block';
            document.getElementById('listaEntregas').innerHTML = '<p style="text-align:center;color:var(--gray-400)"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';
            try {
                const res = await fetch(`${API}/profesor/tareas/${tareaId}/entregas`);
                const entregas = await res.json();
                if (!entregas.length) {
                    document.getElementById('listaEntregas').innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:20px">Aún no hay entregas para esta actividad</p>';
                    return;
                }
                document.getElementById('listaEntregas').innerHTML = entregas.map(e => `
                    <div style="background:rgba(108,99,255,0.08);border:1px solid rgba(108,99,255,0.15);border-radius:12px;padding:16px;margin-bottom:12px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                            <strong style="color:#fff">${e.nombre}</strong>
                            <span class="badge ${e.es_tardia ? 'badge-warning' : 'badge-success'}" style="font-size:0.7rem">${e.es_tardia ? 'Tardía' : 'A tiempo'}</span>
                        </div>
                        <div style="color:var(--gray-400);font-size:0.85rem;margin-bottom:6px"><i class="fas fa-calendar"></i> ${e.fecha_entrega}</div>
                        ${e.comentario ? `<div style="color:var(--gray-300);font-size:0.85rem;margin-bottom:6px"><i class="fas fa-comment"></i> ${e.comentario}</div>` : ''}
                        <a href="${e.enlace}" target="_blank" style="color:var(--primary);font-size:0.85rem;text-decoration:none"><i class="fas fa-external-link-alt"></i> Ver entrega</a>
                    </div>
                `).join('');
            } catch (err) { console.error(err); }
        }
        function cerrarModalEntregas() {
            document.getElementById('modalEntregasOverlay').style.display = 'none';
            document.getElementById('modalEntregas').style.display = 'none';
        }
        document.getElementById('modalEntregasOverlay').addEventListener('click', cerrarModalEntregas);

        // ── NOTIFICACIONES ──
        async function cargarNotificaciones() {
            try {
                const res = await fetch(`${API}/notificaciones`);
                const notifs = await res.json();
                const list = document.getElementById('notifList');
                const count = document.getElementById('notifCount');
                const bell = document.getElementById('bellBtn');
                if (!notifs.length) {
                    list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash"></i><br>Sin notificaciones</div>';
                    count.style.display = 'none';
                    bell.classList.remove('has-notif');
                    return;
                }
                count.textContent = notifs.length;
                count.style.display = 'flex';
                bell.classList.add('has-notif');
                const iconMap = { noticia: 'fa-bullhorn', evento: 'fa-calendar-check', aviso: 'fa-exclamation-triangle' };
                list.innerHTML = notifs.map(n => {
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
            } catch (err) { console.error('Error cargando notificaciones:', err); }
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

        // -- Aplicar control de acceso desde configuración de empresa --
        (async function aplicarAccesoModulos() {
            try {
                const res = await fetch(`${API}/empresa`);
                const emp = await res.json();
                if (emp.logo) {
                    const logo = document.getElementById('companyLogo');
                    if (logo) logo.src = emp.logo;
                }
                if (emp.nombre) document.title = 'EduGestión - ' + emp.nombre;
                // Fallback to true if undefined (para desarrollo/pruebas)
                const access = emp.acceso_modulos || { 
                    observador: true, anuncios: true, estudiantes: true, 
                    acudientes: true, reportes: true 
                };
                
                const btnObs = document.getElementById('btn-nav-observador');
                const btnAnun = document.getElementById('btn-nav-anuncios');
                const btnEst = document.getElementById('btn-nav-estudiantes');
                const btnAcud = document.getElementById('btn-nav-acudientes');
                const btnRep = document.getElementById('btn-nav-reportes');
                
                if (btnObs) btnObs.style.display = access.observador ? 'flex' : 'none';
                if (btnAnun) btnAnun.style.display = access.anuncios ? 'flex' : 'none';
                if (btnEst) btnEst.style.display = access.estudiantes ? 'flex' : 'none';
                if (btnAcud) btnAcud.style.display = access.acudientes ? 'flex' : 'none';
                if (btnRep) btnRep.style.display = access.reportes ? 'flex' : 'none';
            } catch(e) {
                console.warn('Control de acceso no pudo cargar:', e.message);
            }
        })();
    
// ==========================================
// FUNCIONES INYECTADAS (VERSIÓN LIMPIA)
// ==========================================

// --- OBSERVADOR ---
async function cargarObservadorClean() {
    try {
        const resCursos = await fetch(`${API}/cursos`);
        const cursos = await resCursos.json();
        const opts = '<option value="">Seleccione Curso</option>' + 
            cursos.map(c => `<option value="${c.curso_id}">${c.codigo} - ${c.nombre || c.codigo}</option>`).join('');
        document.getElementById('obsPlanillaCursoClean').innerHTML = opts;
    } catch(e) { console.error('Error cargando cursos observador:', e); }
}

async function buscarEstudiantesObsClean(cursoId) {
    if (!cursoId) {
        document.getElementById('obsSelectEstudianteClean').innerHTML = '<option value="">Seleccione primero el curso</option>';
        return;
    }
    try {
        const res = await fetch(`${API}/estudiantes?curso=${cursoId}`);
        const data = await res.json();
        const opts = '<option value="">Seleccione Estudiante</option>' + 
            (data.estudiantes || []).map(e => `<option value="${e.estudiante_id}">${e.nombre}</option>`).join('');
        document.getElementById('obsSelectEstudianteClean').innerHTML = opts;
    } catch(e) { console.error('Error buscando estudiantes:', e); }
}

async function verObservacionesEstudianteClean(estudianteId) {
    const contenedor = document.getElementById('obsListaClean');
    if (!estudianteId) {
        contenedor.innerHTML = '';
        return;
    }
    contenedor.innerHTML = '<div style="text-align:center">Cargando observaciones...</div>';
    try {
        const res = await fetch(`${API}/observaciones?estudiante=${estudianteId}`);
        const obs = await res.json();
        if (obs.length === 0) {
            contenedor.innerHTML = '<div style="color:var(--gray-500);text-align:center;">No hay observaciones para este estudiante.</div>';
            return;
        }
        contenedor.innerHTML = obs.map(o => `
            <div style="background:var(--bg-secondary); padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid ${o.tipo==='Positiva'?'var(--success)':o.tipo==='Negativa'?'var(--danger)':'var(--warning)'}">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <strong>${o.tipo} - ${o.categoria || 'General'}</strong>
                    <small style="color:var(--gray-500)">${new Date(o.fecha).toLocaleDateString()}</small>
                </div>
                <p style="margin:0; font-size:0.9rem">${o.descripcion}</p>
                <div style="margin-top:8px; font-size:0.8rem; color:var(--gray-500)">Docente: ${o.docente_nombre || o.docente_id || 'N/A'}</div>
            </div>
        `).join('');
    } catch(e) {
        console.error('Error cargando observaciones:', e);
        contenedor.innerHTML = '<div style="color:red;text-align:center;">Error al cargar las observaciones.</div>';
    }
}

// --- ANUNCIOS ---
async function cargarAnunciosClean() {
    const lista = document.getElementById('anunciosListaClean');
    lista.innerHTML = '<div style="text-align:center;padding:20px;">Cargando...</div>';
    try {
        const res = await fetch(`${API}/anuncios`);
        const anuncios = await res.json();
        if (anuncios.length === 0) {
            lista.innerHTML = '<div style="text-align:center;color:var(--gray-500)">No hay anuncios disponibles.</div>';
            return;
        }
        lista.innerHTML = anuncios.map(a => `
            <div style="background:var(--bg-secondary); padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid var(--border)">
                <h4 style="margin:0 0 5px 0; color:var(--primary)">${a.titulo || 'Sin título'}</h4>
                <div style="font-size:0.8rem; color:var(--gray-500); margin-bottom:10px">
                    ${new Date(a.fecha).toLocaleDateString()} | Para: ${a.destinatarios || 'Todos'}
                </div>
                <p style="margin:0; font-size:0.9rem; line-height:1.4">${a.contenido}</p>
            </div>
        `).join('');
    } catch(e) { console.error(e); document.getElementById('anunciosListaClean').innerHTML = `<div style='color:red'>ERROR: ${e.message}</div>`; }
}

// --- ESTUDIANTES ---
let mapaCursosClean = {};
let sortDirectionsClean = {
    nombre: 'asc',
    codigo: 'asc',
    grado: 'asc',
    estado: 'asc'
};
async function cargarEstudiantesClean() {
    try {
        if (Object.keys(mapaCursosClean).length === 0) {
            try {
                const resC = await fetch(`${API}/cursos`);
                const cursos = await resC.json();
                cursos.forEach(c => {
                    mapaCursosClean[c.curso_id] = parseFloat(c.orden || c.curso_id) || 0;
                });
            } catch (e) {
                console.error('Error cargando cursos para ordenación:', e);
            }
        }
        const res = await fetch(`${API}/estudiantes?limit=200`);
        const data = await res.json();
        window.listaEstudiantesClean = data.estudiantes || [];
        renderEstudiantesClean(window.listaEstudiantesClean);
    } catch(e) { 
        console.error(e); 
        document.getElementById('tablaEstudiantesClean').innerHTML = `<tr><td colspan='5' style='color:red'>ERROR: ${e.message}</td></tr>`; 
    }
}

function renderEstudiantesClean(estudiantes) {
    const tbody = document.getElementById('tablaEstudiantesClean');
    if (!estudiantes || estudiantes.length === 0) {
        tbody.innerHTML = `<tr><td colspan='5'>No se encontraron estudiantes en la DB.</td></tr>`;
        return;
    }
    tbody.innerHTML = estudiantes.map(e => `
        <tr>
            <td>${e.nombre || '—'}</td>
            <td>${e.estudiante_id || '—'}</td>
            <td>${e.curso_nombre || e.curso_id || '—'}</td>
            <td>${e.documento || '—'}</td>
            <td><span class="badge badge-${e.estado_est === 'R' ? 'danger' : e.estado_est === 'T' ? 'warning' : 'success'}">${e.estado_est === 'R' ? 'Retirado' : e.estado_est === 'T' ? 'Trasladado' : 'Matriculado'}</span></td>
        </tr>
    `).join('');
}

function ordenarEstudiantesClean(campo) {
    if (!window.listaEstudiantesClean || !window.listaEstudiantesClean.length) return;
    const dir = sortDirectionsClean[campo] === 'asc' ? 'desc' : 'asc';
    sortDirectionsClean[campo] = dir;

    // Reset icons
    document.getElementById('sort-icon-clean-nombre').className = 'fas fa-sort';
    document.getElementById('sort-icon-clean-codigo').className = 'fas fa-sort';
    document.getElementById('sort-icon-clean-grado').className = 'fas fa-sort';
    document.getElementById('sort-icon-clean-estado').className = 'fas fa-sort';

    const activeIcon = document.getElementById('sort-icon-clean-' + campo);
    if (activeIcon) {
        activeIcon.className = dir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }

    window.listaEstudiantesClean.sort((a, b) => {
        let comp = 0;
        if (campo === 'nombre') {
            comp = (a.nombre || '').localeCompare(b.nombre || '', 'es', { numeric: true });
        } else if (campo === 'codigo') {
            comp = (a.estudiante_id || '').localeCompare(b.estudiante_id || '', 'es', { numeric: true });
        } else if (campo === 'grado') {
            const ordA = mapaCursosClean[a.curso_id] || 0;
            const ordB = mapaCursosClean[b.curso_id] || 0;
            if (ordA !== ordB) {
                comp = ordA - ordB;
            } else {
                comp = (a.curso_nombre || '').localeCompare(b.curso_nombre || '', 'es', { numeric: true });
            }
        } else if (campo === 'estado') {
            const labelA = a.estado_est === 'R' ? 'Retirado' : (a.estado_est === 'T' ? 'Trasladado' : 'Matriculado');
            const labelB = b.estado_est === 'R' ? 'Retirado' : (b.estado_est === 'T' ? 'Trasladado' : 'Matriculado');
            comp = labelA.localeCompare(labelB, 'es', { numeric: true });
        }
        return dir === 'asc' ? comp : -comp;
    });

    renderEstudiantesClean(window.listaEstudiantesClean);
}


// --- ACUDIENTES ---
let listaAcudientesClean = [];
let sortDirectionsAcudClean = { nombre:'asc', identificacion:'asc', telefono:'asc', correo:'asc', formacion:'asc' };
async function cargarAcudientesClean() {
    try {
        const res = await fetch(`${API}/acudientes?limit=200`);
        const data = await res.json();
        listaAcudientesClean = data.acudientes || [];
        renderAcudientesClean(listaAcudientesClean);
    } catch(e) { 
        console.error(e); 
        document.getElementById('tablaAcudientesClean').innerHTML = `<tr><td colspan='5' style='color:red'>ERROR: ${e.message}</td></tr>`; 
    }
}
function renderAcudientesClean(acudientes) {
    const tbody = document.getElementById('tablaAcudientesClean');
    if (!acudientes || !acudientes.length) {
        tbody.innerHTML = `<tr><td colspan='5'>No se encontraron acudientes.</td></tr>`;
        return;
    }
    tbody.innerHTML = acudientes.map(a => `
        <tr>
            <td>${a.nombre_asistente || '—'}</td>
            <td>${a.id_acud || a.Id || '—'}</td>
            <td>${a.tel_acud || '—'}</td>
            <td>${a.correo_acud || '—'}</td>
            <td>${a.formacion_acud || '—'}</td>
        </tr>
    `).join('');
}
function ordenarAcudientesClean(campo) {
    if (!listaAcudientesClean.length) return;
    const dir = sortDirectionsAcudClean[campo] === 'asc' ? 'desc' : 'asc';
    sortDirectionsAcudClean[campo] = dir;
    ['nombre','identificacion','telefono','correo','formacion'].forEach(c => {
        const el = document.getElementById('sort-icon-acudclean-' + c);
        if (el) el.className = 'fas fa-sort';
    });
    const icon = document.getElementById('sort-icon-acudclean-' + campo);
    if (icon) icon.className = dir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    listaAcudientesClean.sort((a, b) => {
        let va = '', vb = '';
        if (campo === 'nombre') { va = a.nombre_asistente || ''; vb = b.nombre_asistente || ''; }
        else if (campo === 'identificacion') { va = a.id_acud || a.Id || ''; vb = b.id_acud || b.Id || ''; }
        else if (campo === 'telefono') { va = a.tel_acud || ''; vb = b.tel_acud || ''; }
        else if (campo === 'correo') { va = a.correo_acud || ''; vb = b.correo_acud || ''; }
        else if (campo === 'formacion') { va = a.formacion_acud || ''; vb = b.formacion_acud || ''; }
        const comp = va.localeCompare(vb, 'es', { numeric: true });
        return dir === 'asc' ? comp : -comp;
    });
    renderAcudientesClean(listaAcudientesClean);
}
// --- REPORTES ---
async function cargarReportesClean() {
    try {
        const res = await fetch(`${API}/reportes/stats`);
        const s = await res.json();
        document.getElementById('repTasaAprobacionClean').textContent = (s.tasaAprobacion || 0) + '%';
        document.getElementById('repEnRiesgoClean').textContent = s.enRiesgo || 0;
        document.getElementById('repAsistenciaClean').textContent = (s.tasaAsistencia || 0) + '%';
    } catch(e) { console.error(e); document.getElementById('repEnRiesgoClean').innerHTML = `<span style='color:red'>ERR</span>`; }
}

window.AI_SERVICE_URL = 'http://localhost:3001';