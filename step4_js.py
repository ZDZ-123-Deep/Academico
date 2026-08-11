import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

js_functions = """
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
    } catch(e) { console.error('Error cargando anuncios:', e); }
}

// --- ESTUDIANTES ---
async function cargarEstudiantesClean() {
    try {
        const res = await fetch(`${API}/estudiantes?limit=200`);
        const data = await res.json();
        const tbody = document.getElementById('tablaEstudiantesClean');
        tbody.innerHTML = (data.estudiantes || []).map(e => `
            <tr>
                <td>${e.nombre || '—'}</td>
                <td>${e.estudiante_id || '—'}</td>
                <td>${e.curso_id || '—'}</td>
                <td>${e.documento || '—'}</td>
                <td><span class="badge badge-${e.estado_est === 'R' ? 'danger' : e.estado_est === 'T' ? 'warning' : 'success'}">${e.estado_est === 'R' ? 'Retirado' : e.estado_est === 'T' ? 'Trasladado' : 'Matriculado'}</span></td>
            </tr>
        `).join('');
    } catch(e) { console.error('Error cargando estudiantes:', e); }
}

// --- ACUDIENTES ---
async function cargarAcudientesClean() {
    try {
        const res = await fetch(`${API}/acudientes?limit=200`);
        const data = await res.json();
        const tbody = document.getElementById('tablaAcudientesClean');
        tbody.innerHTML = (data.acudientes || []).map(a => `
            <tr>
                <td>${a.nombre_asistente || '—'}</td>
                <td>${a.id_acud || a.Id || '—'}</td>
                <td>${a.tel_acud || '—'}</td>
                <td>${a.correo_acud || '—'}</td>
                <td>${a.formacion_acud || '—'}</td>
            </tr>
        `).join('');
    } catch(e) { console.error('Error cargando acudientes:', e); }
}

// --- REPORTES ---
async function cargarReportesClean() {
    try {
        const res = await fetch(`${API}/reportes/stats`);
        const s = await res.json();
        document.getElementById('repTasaAprobacionClean').textContent = (s.tasaAprobacion || 0) + '%';
        document.getElementById('repEnRiesgoClean').textContent = s.enRiesgo || 0;
        document.getElementById('repAsistenciaClean').textContent = (s.tasaAsistencia || 0) + '%';
    } catch(e) { console.error('Error cargando reportes:', e); }
}
"""

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Inject right before </script>
content = content.replace("</script>\n</body>", js_functions + "\n</script>\n</body>")

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected clean JS functions.")
