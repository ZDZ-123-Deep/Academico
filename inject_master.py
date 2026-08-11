"""
Master script to inject 5 new modules into VistaProfesor.html cleanly.
Modules: Observador, Anuncios, Estudiantes, Acudientes, Reportes
Strategy: inject JS first (before </script>), then inject HTML (before </body>)
"""
import re, sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== Leyendo archivos fuente ===")
with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    admin = f.read()
with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    prof = f.read()

print(f"Admin: {len(admin)} bytes | Profesor: {len(prof)} bytes")

# =========================================================
# HELPERS
# =========================================================
def extract_section(html, start_id, end_id):
    start_tag = f'<div class="section" id="{start_id}">'
    start = html.find(start_tag)
    if start == -1:
        print(f"  ERROR: Seccion {start_id} no encontrada")
        return ''
    end = html.find(f'<div class="section" id="{end_id}">', start)
    if end == -1:
        end = html.rfind('</main>')
    return html[start:end]

def extract_js_between(html, start_fn, end_fn):
    start = html.find(start_fn)
    if start == -1:
        print(f"  WARN: '{start_fn[:40]}' no encontrado")
        return ''
    end = html.find(end_fn, start)
    if end == -1:
        print(f"  WARN: end '{end_fn[:40]}' no encontrado")
        return ''
    return html[start:end]

# =========================================================
# PASO 1: Extraer secciones HTML
# =========================================================
print("\n=== Extrayendo secciones HTML ===")
sec_observador  = extract_section(admin, 'secObservador',  'secPagos')
sec_anuncios    = extract_section(admin, 'secAnuncios',    'secConfigAvanzada')
sec_estudiantes = extract_section(admin, 'secEstudiantes', 'secCursos')
sec_acudientes  = extract_section(admin, 'secAcudientes',  'secAsignaturas')
sec_reportes    = extract_section(admin, 'secReportes',    'secNotificaciones')

print(f"  Observador HTML:  {len(sec_observador)} bytes")
print(f"  Anuncios HTML:    {len(sec_anuncios)} bytes")
print(f"  Estudiantes HTML: {len(sec_estudiantes)} bytes")
print(f"  Acudientes HTML:  {len(sec_acudientes)} bytes")
print(f"  Reportes HTML:    {len(sec_reportes)} bytes")

# =========================================================
# PASO 2: Extraer bloques JS
# =========================================================
print("\n=== Extrayendo bloques JS ===")

js_observador  = extract_js_between(admin,
    'async function cargarObservaciones()',
    'async function cargarPagos')

js_anuncios    = extract_js_between(admin,
    'async function cargarAnuncios()',
    'async function cargarConfigAvanzada')

js_estudiantes = extract_js_between(admin,
    'async function cargarEstudiantes()',
    'async function cargarAcudientes')

js_acudientes  = extract_js_between(admin,
    'async function cargarAcudientes()',
    'async function cargarAsignaturas')

js_reportes    = extract_js_between(admin,
    'async function cargarReportes',
    'async function cargarNotificaciones')

print(f"  Observador JS:  {len(js_observador)} bytes")
print(f"  Anuncios JS:    {len(js_anuncios)} bytes")
print(f"  Estudiantes JS: {len(js_estudiantes)} bytes")
print(f"  Acudientes JS:  {len(js_acudientes)} bytes")
print(f"  Reportes JS:    {len(js_reportes)} bytes")

# =========================================================
# PASO 3: Sanitizar: quitar re-declaraciones de const/let
#         que ya existen en el archivo del profesor
# =========================================================
existing_vars = set(re.findall(r'\b(?:const|let)\s+(\w+)\b', prof))
print(f"\n  Variables ya declaradas en VistaProfesor: {len(existing_vars)}")

def dedup_consts(js_block, existing_vars):
    def replacer(m):
        keyword = m.group(1)
        var_name = m.group(2)
        if var_name in existing_vars:
            return var_name + ' ='
        return f'{keyword} {var_name} ='
    return re.sub(r'\b(const|let)\s+(\w+)\s*=', replacer, js_block)

js_observador  = dedup_consts(js_observador, existing_vars)
js_anuncios    = dedup_consts(js_anuncios, existing_vars)
js_estudiantes = dedup_consts(js_estudiantes, existing_vars)
js_acudientes  = dedup_consts(js_acudientes, existing_vars)
js_reportes    = dedup_consts(js_reportes, existing_vars)

# =========================================================
# PASO 4: Actualizar mostrarSeccion (map + titles + handlers)
# =========================================================
print("\n=== Actualizando mostrarSeccion ===")

old_map = "const map = { dashboard: 'secDashboard', cursos: 'secCursos', calificaciones: 'secCalificaciones', asistencia: 'secAsistencia', horario: 'secHorario', actividades: 'secActividades' };"
new_map = "const map = { dashboard: 'secDashboard', cursos: 'secCursos', calificaciones: 'secCalificaciones', asistencia: 'secAsistencia', horario: 'secHorario', actividades: 'secActividades', observador: 'secObservador', anuncios: 'secAnuncios', estudiantes: 'secEstudiantes', acudientes: 'secAcudientes', reportes: 'secReportes' };"
if old_map in prof:
    prof = prof.replace(old_map, new_map)
    print("  [OK] map actualizado")
else:
    print("  [WARN] map no encontrado")

old_titles = "const titles = { dashboard: 'Panel <span>Profesor</span>', cursos: 'Mis <span>Cursos</span>', calificaciones: '<span>Calificaciones</span>', asistencia: 'Control de <span>Asistencia</span>', horario: 'Mi <span>Horario</span>', actividades: '<span>Actividades</span>' };"
new_titles = "const titles = { dashboard: 'Panel <span>Profesor</span>', cursos: 'Mis <span>Cursos</span>', calificaciones: '<span>Calificaciones</span>', asistencia: 'Control de <span>Asistencia</span>', horario: 'Mi <span>Horario</span>', actividades: '<span>Actividades</span>', observador: '<span>Observador</span>', anuncios: '<span>Anuncios</span>', estudiantes: '<span>Estudiantes</span>', acudientes: '<span>Acudientes</span>', reportes: '<span>Reportes</span>' };"
if old_titles in prof:
    prof = prof.replace(old_titles, new_titles)
    print("  [OK] titles actualizado")
else:
    print("  [WARN] titles no encontrado")

old_load = "document.getElementById('headerTitle').innerHTML = titles[id];"
new_load = """document.getElementById('headerTitle').innerHTML = titles[id] || id;
            if (id === 'observador') cargarObservaciones();
            if (id === 'anuncios') cargarAnuncios();
            if (id === 'estudiantes') cargarEstudiantes();
            if (id === 'acudientes') cargarAcudientes();
            if (id === 'reportes' && typeof cargarReportes === 'function') cargarReportes();"""
if old_load in prof:
    prof = prof.replace(old_load, new_load)
    print("  [OK] handlers de carga agregados")
else:
    print("  [WARN] headerTitle handler no encontrado")

# =========================================================
# PASO 5: Inyectar botones en el sidebar
# =========================================================
print("\n=== Inyectando botones en sidebar ===")
actividades_btn = "onclick=\"mostrarSeccion('actividades',this)\""
idx = prof.find(actividades_btn)
if idx != -1:
    close_btn = prof.find('</button>', idx) + len('</button>')
    new_buttons = """
            <button class="nav-item" onclick="mostrarSeccion('observador',this)">
                <i class="fas fa-eye"></i> Observador
            </button>
            <button class="nav-item" onclick="mostrarSeccion('anuncios',this)">
                <i class="fas fa-bullhorn"></i> Anuncios
            </button>
            <button class="nav-item" onclick="mostrarSeccion('estudiantes',this)">
                <i class="fas fa-user-graduate"></i> Estudiantes
            </button>
            <button class="nav-item" onclick="mostrarSeccion('acudientes',this)">
                <i class="fas fa-users"></i> Acudientes
            </button>
            <button class="nav-item" onclick="mostrarSeccion('reportes',this)">
                <i class="fas fa-chart-line"></i> Reportes
            </button>"""
    prof = prof[:close_btn] + new_buttons + prof[close_btn:]
    print("  [OK] Botones inyectados")
else:
    print("  [WARN] Boton Actividades no encontrado")

# =========================================================
# PASO 6: Inyectar JS antes del </script> principal
#         Nota: hacemos esto ANTES de inyectar HTML para que
#         los indices no se desplacen
# =========================================================
print("\n=== Inyectando JS antes de </script> ===")

# La unica etiqueta </script> del bloque principal esta al final del script
# El script esta entre las lineas 426 y el ultimo </script>
# Buscamos el cierre del script DENTRO del body (no el de chart.js ni darkMode)
script_open_idx = prof.find('<script>', prof.find('<body'))
script_close_idx = prof.find('</script>', script_open_idx)
print(f"  Script abre en: {script_open_idx}, cierra en: {script_close_idx}")

all_new_js = """

// =============================================
// MODULOS INYECTADOS DESDE VISTAADMIN
// =============================================

// -- OBSERVADOR --
""" + js_observador + """

// -- ANUNCIOS --
""" + js_anuncios + """

// -- ESTUDIANTES (solo lectura) --
""" + js_estudiantes + """

// -- ACUDIENTES (solo lectura) --
""" + js_acudientes + """

// -- REPORTES --
""" + js_reportes + """

// -- CONTROL DE ACCESO POR ROL --
window.aplicarControlAcceso = function(modulosConfig) {
    const rolActual = 'profesor';
    const modulosActivos = modulosConfig[rolActual] || [];
    document.querySelectorAll('.nav-item').forEach(function(btn) {
        const oc = btn.getAttribute('onclick') || '';
        const m = oc.match(/mostrarSeccion\\('([^']+)'/);
        if (m) {
            const secId = m[1];
            btn.style.display = modulosActivos.includes(secId) ? 'flex' : 'none';
        }
    });
};
"""

prof = prof[:script_close_idx] + all_new_js + prof[script_close_idx:]
print(f"  [OK] JS inyectado")

# =========================================================
# PASO 7: Inyectar HTML de secciones antes de </body>
#         (DESPUES de inyectar JS para que los indices sean correctos)
# =========================================================
print("\n=== Inyectando secciones HTML antes de </body> ===")

body_close = prof.rfind('</body>')
print(f"  </body> encontrado en posicion: {body_close}")

new_html = """
    <!-- ===== OBSERVADOR (inyectado) ===== -->
""" + sec_observador + """
    <!-- ===== ANUNCIOS (inyectado) ===== -->
""" + sec_anuncios + """
    <!-- ===== ESTUDIANTES (inyectado) ===== -->
""" + sec_estudiantes + """
    <!-- ===== ACUDIENTES (inyectado) ===== -->
""" + sec_acudientes + """
    <!-- ===== REPORTES (inyectado) ===== -->
""" + sec_reportes

prof = prof[:body_close] + new_html + '\n' + prof[body_close:]
print(f"  [OK] HTML inyectado")

# =========================================================
# PASO 8: Parchear cargarAparienciaGlobal para aplicar acceso
# =========================================================
print("\n=== Conectando control de acceso ===")
old_logo = "if (emp.logo) document.getElementById('companyLogo').src = emp.logo;"
new_logo = """if (emp.logo) document.getElementById('companyLogo').src = emp.logo;
                if (emp.nombre) document.title = 'EduGestion - ' + emp.nombre;
                if (emp.acceso_modulos && window.aplicarControlAcceso) {
                    window.aplicarControlAcceso(emp.acceso_modulos);
                }"""
if old_logo in prof:
    prof = prof.replace(old_logo, new_logo, 1)
    print("  [OK] aplicarControlAcceso conectado")
else:
    print("  [WARN] bloque logo no encontrado, buscando alternativa")
    # try to find where empresa is fetched
    empresa_call = prof.find("fetch(`${API}/empresa`)")
    if empresa_call != -1:
        # Inject after the fetch block
        empresa_block_end = prof.find('} catch', empresa_call)
        if empresa_block_end != -1:
            access_inject = """
                if (emp.acceso_modulos && window.aplicarControlAcceso) {
                    window.aplicarControlAcceso(emp.acceso_modulos);
                }
"""
            prof = prof[:empresa_block_end] + access_inject + prof[empresa_block_end:]
            print("  [OK] aplicarControlAcceso inyectado via fallback")
        
# =========================================================
# PASO 9: Guardar resultado
# =========================================================
print("\n=== Guardando VistaProfesor.html ===")
with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(prof)
print(f"  Guardado. Tamano final: {len(prof)} bytes ({len(prof)//1024} KB)")
print("\nDone!")
