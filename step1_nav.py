import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add sidebar buttons
sidebar_buttons = """
        <button class="nav-item" onclick="mostrarSeccion('actividades',this)">
            <i class="fas fa-tasks"></i> Actividades
        </button>
        <!-- Módulos Inyectados -->
        <button class="nav-item mod-inyectado" id="btn-nav-observador" style="display:none" onclick="mostrarSeccion('observador',this)">
            <i class="fas fa-eye"></i> Observador
        </button>
        <button class="nav-item mod-inyectado" id="btn-nav-anuncios" style="display:none" onclick="mostrarSeccion('anuncios',this)">
            <i class="fas fa-bullhorn"></i> Anuncios
        </button>
        <button class="nav-item mod-inyectado" id="btn-nav-estudiantes" style="display:none" onclick="mostrarSeccion('estudiantes',this)">
            <i class="fas fa-user-graduate"></i> Estudiantes
        </button>
        <button class="nav-item mod-inyectado" id="btn-nav-acudientes" style="display:none" onclick="mostrarSeccion('acudientes',this)">
            <i class="fas fa-user-friends"></i> Acudientes
        </button>
        <button class="nav-item mod-inyectado" id="btn-nav-reportes" style="display:none" onclick="mostrarSeccion('reportes',this)">
            <i class="fas fa-chart-line"></i> Reportes
        </button>
"""
content = content.replace(
    '<button class="nav-item" onclick="mostrarSeccion(\'actividades\',this)">\n            <i class="fas fa-tasks"></i> Actividades\n        </button>',
    sidebar_buttons
)

# 2. Update mostrarSeccion
new_mostrar_seccion = """function mostrarSeccion(id, btn) {
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

            if (window.innerWidth <= 768) toggleSidebar();
        }"""

# Find the original mostrarSeccion and replace it
# Use regex to replace the function definition
pattern = r"function mostrarSeccion\(id,\s*btn\)\s*\{.*?(?=\s*function toggleSidebar)"
content = re.sub(pattern, new_mostrar_seccion + "\n        ", content, flags=re.DOTALL)

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated sidebar and routing.")
