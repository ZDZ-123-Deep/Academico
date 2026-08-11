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

        