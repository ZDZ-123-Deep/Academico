
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
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const map = { dashboard: 'secDashboard', cursos: 'secCursos', calificaciones: 'secCalificaciones', asistencia: 'secAsistencia', horario: 'secHorario', actividades: 'secActividades' };
            document.getElementById(map[id]).classList.add('active');
            if (btn) btn.classList.add('active');
            const titles = { dashboard: 'Panel <span>Profesor</span>', cursos: 'Mis <span>Cursos</span>', calificaciones: '<span>Calificaciones</span>', asistencia: 'Control de <span>Asistencia</span>', horario: 'Mi <span>Horario</span>', actividades: '<span>Actividades</span>' };
            document.getElementById('headerTitle').innerHTML = titles[id];
            if (window.innerWidth <= 768) toggleSidebar();
        }
        function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active') }
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
                                    console.log('Mod:', modId, 'isVisible:', isVisible, 'accesos:', accesos[modId], 'rol:', rolActual);

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
    