import re

with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    admin_html = f.read()

# Extract secAcudientes
start_tag = '<div class="section" id="secAcudientes">'
start = admin_html.find(start_tag)
end = admin_html.find('<div class="section" id="secAsignaturas">', start)
acudientes_html = admin_html[start:end]

# Remove "Crear Acudiente" button
acudientes_html = re.sub(r'<button class="btn btn-primary" onclick="mostrarModalAcudiente\(\)">.*?<i class="fas fa-plus"></i>.*?Nuevo Acudiente.*?</button>', '', acudientes_html, flags=re.DOTALL)
acudientes_html = re.sub(r'<button[^>]*onclick="mostrarModalAcudiente\(\)"[^>]*>.*?</button>', '', acudientes_html, flags=re.DOTALL)

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    prof_html = f.read()

# Inject HTML into main-content
inject_point = prof_html.find('</div> <!-- Fin main-content -->')
if inject_point != -1:
    prof_html = prof_html[:inject_point] + acudientes_html + prof_html[inject_point:]
    
# Extract Acudientes JS
js_start = admin_html.find('async function cargarAcudientes')
js_end = admin_html.find('// 📚 ASIGNATURAS', js_start)

acudientes_js = admin_html[js_start:js_end]

# Remove the action buttons (edit/delete) from the render function
acudientes_js = re.sub(r'<button class="btn-icon".*?onclick="editarAcudiente.*?<i class="fas fa-edit".*?</button>', '', acudientes_js, flags=re.DOTALL)
acudientes_js = re.sub(r'<button class="btn-icon".*?onclick="eliminarAcudiente.*?<i class="fas fa-trash".*?</button>', '', acudientes_js, flags=re.DOTALL)
# Also remove any "vincularHijo" or "gestionarHijos" button if any
acudientes_js = re.sub(r'<button class="btn-icon".*?onclick="gestionarHijos.*?<i class="fas fa-child".*?</button>', '', acudientes_js, flags=re.DOTALL)

# Inject JS into script
script_end = prof_html.find('})();', prof_html.rfind('async function cargarAparienciaGlobal'))
if script_end != -1:
    prof_html = prof_html[:script_end+7] + '\n\n' + acudientes_js + prof_html[script_end+7:]

# Inject Nav button
nav_start = prof_html.find('<button class="nav-item" onclick="mostrarSeccion(\'estudiantes\',this)">')
if nav_start != -1:
    nav_end = prof_html.find('</button>', nav_start) + 9
    nav_btn = '''
<button class="nav-item" onclick="mostrarSeccion('acudientes',this)">
    <i class="fas fa-users"></i> Acudientes
</button>
'''
    prof_html = prof_html[:nav_end] + nav_btn + prof_html[nav_end:]

# Update mostrarSeccion
prof_html = prof_html.replace(
    "estudiantes: 'secEstudiantes' };",
    "estudiantes: 'secEstudiantes', acudientes: 'secAcudientes' };"
)
prof_html = prof_html.replace(
    "estudiantes: '<span>Estudiantes</span>' };",
    "estudiantes: '<span>Estudiantes</span>', acudientes: '<span>Acudientes</span>' };"
)
prof_html = prof_html.replace(
    "if (id === 'estudiantes') cargarEstudiantes();",
    "if (id === 'estudiantes') cargarEstudiantes();\n            if (id === 'acudientes') cargarAcudientes();"
)

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(prof_html)
print('Done. Saved to VistaProfesor.html')
