import re

with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    admin_html = f.read()

# Extract secReportes
start_tag = '<div class="section" id="secReportes">'
start = admin_html.find(start_tag)
end = admin_html.find('<div class="section" id="secNotificaciones">', start)
reportes_html = admin_html[start:end]

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    prof_html = f.read()

# Inject HTML into main-content
inject_point = prof_html.find('</div> <!-- Fin main-content -->')
if inject_point != -1:
    prof_html = prof_html[:inject_point] + reportes_html + prof_html[inject_point:]
    
# Extract Reportes JS
js_start = admin_html.find('// 📈 REPORTES')
js_end = admin_html.find('// 🔔 NOTIFICACIONES', js_start)

reportes_js = admin_html[js_start:js_end]

# Inject JS into script
script_end = prof_html.find('})();', prof_html.rfind('async function cargarAparienciaGlobal'))
if script_end != -1:
    prof_html = prof_html[:script_end+7] + '\n\n' + reportes_js + prof_html[script_end+7:]

# Inject Nav button
nav_start = prof_html.find('<button class="nav-item" onclick="mostrarSeccion(\'acudientes\',this)">')
if nav_start != -1:
    nav_end = prof_html.find('</button>', nav_start) + 9
    nav_btn = '''
<button class="nav-item" onclick="mostrarSeccion('reportes',this)">
    <i class="fas fa-chart-line"></i> Reportes
</button>
'''
    prof_html = prof_html[:nav_end] + nav_btn + prof_html[nav_end:]

# Update mostrarSeccion
prof_html = prof_html.replace(
    "acudientes: 'secAcudientes' };",
    "acudientes: 'secAcudientes', reportes: 'secReportes' };"
)
prof_html = prof_html.replace(
    "acudientes: '<span>Acudientes</span>' };",
    "acudientes: '<span>Acudientes</span>', reportes: '<span>Reportes</span>' };"
)
prof_html = prof_html.replace(
    "if (id === 'acudientes') cargarAcudientes();",
    "if (id === 'acudientes') cargarAcudientes();\n            if (id === 'reportes') cargarReportes();"
)

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(prof_html)
print('Done. Saved to VistaProfesor.html')
