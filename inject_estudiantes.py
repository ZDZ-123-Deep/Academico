import re

with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    admin_html = f.read()

# Extract secEstudiantes
start_tag = '<div class="section" id="secEstudiantes">'
start = admin_html.find(start_tag)
end = admin_html.find('<div class="section" id="secCursos">', start)
estudiantes_html = admin_html[start:end]

# Remove "Crear Estudiante" button
estudiantes_html = re.sub(r'<button class="btn btn-primary" onclick="mostrarModalEstudiante\(\)">.*?<i class="fas fa-plus"></i>.*?Nuevo Estudiante.*?</button>', '', estudiantes_html, flags=re.DOTALL)
# The actual button might be different. Let's look for any button with onclick="mostrarModalEstudiante()"
estudiantes_html = re.sub(r'<button[^>]*onclick="mostrarModalEstudiante\(\)"[^>]*>.*?</button>', '', estudiantes_html, flags=re.DOTALL)

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    prof_html = f.read()

# Inject HTML into main-content
inject_point = prof_html.find('</div> <!-- Fin main-content -->')
if inject_point != -1:
    prof_html = prof_html[:inject_point] + estudiantes_html + prof_html[inject_point:]
    
# Extract Estudiantes JS
js_start = admin_html.find('async function cargarEstudiantes')
js_end = admin_html.find('// 🎓 CURSOS', js_start)

estudiantes_js = admin_html[js_start:js_end]

# Remove the action buttons (edit/delete) from the render function
estudiantes_js = re.sub(r'<button class="btn-icon".*?onclick="editarEstudiante.*?<i class="fas fa-edit".*?</button>', '', estudiantes_js, flags=re.DOTALL)
estudiantes_js = re.sub(r'<button class="btn-icon".*?onclick="eliminarEstudiante.*?<i class="fas fa-trash".*?</button>', '', estudiantes_js, flags=re.DOTALL)
# Also remove "Nueva Observacion" button if any
estudiantes_js = re.sub(r'<button class="btn-icon".*?onclick="mostrarModalAnotacion.*?<i class="fas fa-comment-dots".*?</button>', '', estudiantes_js, flags=re.DOTALL)

# Inject JS into script
script_end = prof_html.find('})();', prof_html.rfind('async function cargarAparienciaGlobal'))
if script_end != -1:
    prof_html = prof_html[:script_end+7] + '\n\n' + estudiantes_js + prof_html[script_end+7:]

# Inject Nav button
nav_start = prof_html.find('<button class="nav-item" onclick="mostrarSeccion(\'anuncios\',this)">')
if nav_start != -1:
    nav_end = prof_html.find('</button>', nav_start) + 9
    nav_btn = '''
<button class="nav-item" onclick="mostrarSeccion('estudiantes',this)">
    <i class="fas fa-user-graduate"></i> Estudiantes
</button>
'''
    prof_html = prof_html[:nav_end] + nav_btn + prof_html[nav_end:]

# Update mostrarSeccion
prof_html = prof_html.replace(
    "anuncios: 'secAnuncios' };",
    "anuncios: 'secAnuncios', estudiantes: 'secEstudiantes' };"
)
prof_html = prof_html.replace(
    "anuncios: '<span>Anuncios</span>' };",
    "anuncios: '<span>Anuncios</span>', estudiantes: '<span>Estudiantes</span>' };"
)
prof_html = prof_html.replace(
    "if (id === 'anuncios') cargarAnuncios();",
    "if (id === 'anuncios') cargarAnuncios();\n            if (id === 'estudiantes') cargarEstudiantes();"
)

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(prof_html)
print('Done. Saved to VistaProfesor.html')
