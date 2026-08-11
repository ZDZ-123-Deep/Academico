import re

with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    admin_html = f.read()

# Extract secObservador
start_tag = '<div class="section" id="secObservador">'
start = admin_html.find(start_tag)
end = admin_html.find('<div class="section" id="secPagos">', start)
observador_html = admin_html[start:end]

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    prof_html = f.read()

# Inject into main-content
inject_point = prof_html.find('</div> <!-- Fin main-content -->')
if inject_point != -1:
    prof_html = prof_html[:inject_point] + observador_html + prof_html[inject_point:]
    
# Extract Observador JS
js_start = admin_html.find('async function cargarObservaciones')
js_end = admin_html.find('async function cargarPagos', js_start)
if js_end == -1: js_end = admin_html.find('// 👨‍🏫 PROFESORES', js_start)

observador_js = admin_html[js_start:js_end]

# Inject JS into script
script_end = prof_html.find('})();', prof_html.rfind('async function cargarAparienciaGlobal'))
if script_end != -1:
    prof_html = prof_html[:script_end+7] + '\n\n' + observador_js + prof_html[script_end+7:]

# Inject Nav button
nav_start = prof_html.find('<button class="nav-item" onclick="mostrarSeccion(\'actividades\',this)">')
if nav_start != -1:
    nav_end = prof_html.find('</button>', nav_start) + 9
    nav_btn = '''
<button class="nav-item" onclick="mostrarSeccion('observador',this)">
    <i class="fas fa-eye"></i> Observador
</button>
'''
    prof_html = prof_html[:nav_end] + nav_btn + prof_html[nav_end:]

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(prof_html)
print('Done. Saved to VistaProfesor.html')
