import re

with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    admin_html = f.read()

# Extract secAnuncios
start_tag = '<div class="section" id="secAnuncios">'
start = admin_html.find(start_tag)
end = admin_html.find('<div class="section" id="secConfigAvanzada">', start)
if end == -1: end = admin_html.find('<div class="section" id="secSedes">', start)
anuncios_html = admin_html[start:end]

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    prof_html = f.read()

# Inject HTML into main-content
inject_point = prof_html.find('</div> <!-- Fin main-content -->')
if inject_point != -1:
    prof_html = prof_html[:inject_point] + anuncios_html + prof_html[inject_point:]
    
# Extract Anuncios JS
js_start = admin_html.find('async function cargarAnuncios')
js_end = admin_html.find('// ⚙️ CONFIGURACIÓN AVANZADA', js_start)

anuncios_js = admin_html[js_start:js_end]

# Inject JS into script
script_end = prof_html.find('})();', prof_html.rfind('async function cargarAparienciaGlobal'))
if script_end != -1:
    prof_html = prof_html[:script_end+7] + '\n\n' + anuncios_js + prof_html[script_end+7:]

# Inject Nav button
nav_start = prof_html.find('<button class="nav-item" onclick="mostrarSeccion(\'observador\',this)">')
if nav_start != -1:
    nav_end = prof_html.find('</button>', nav_start) + 9
    nav_btn = '''
<button class="nav-item" onclick="mostrarSeccion('anuncios',this)">
    <i class="fas fa-bullhorn"></i> Anuncios
</button>
'''
    prof_html = prof_html[:nav_end] + nav_btn + prof_html[nav_end:]

# Update mostrarSeccion
prof_html = prof_html.replace(
    "observador: 'secObservador' };",
    "observador: 'secObservador', anuncios: 'secAnuncios' };"
)
prof_html = prof_html.replace(
    "observador: '<span>Observador</span>' };",
    "observador: '<span>Observador</span>', anuncios: '<span>Anuncios</span>' };"
)
prof_html = prof_html.replace(
    "if (id === 'observador') cargarObservaciones();",
    "if (id === 'observador') cargarObservaciones();\n            if (id === 'anuncios') cargarAnuncios();"
)

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(prof_html)
print('Done. Saved to VistaProfesor.html')
