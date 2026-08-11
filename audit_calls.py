"""
Audit VistaProfesor.html to find references to admin-only functions
that are called at the top level (not inside other functions).
These would crash on page load.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

# Functions that exist in VistaAdmin but NOT in VistaProfesor original
admin_only_functions = [
    'cargarDatosSeccion', 'cargarDashboard', 'cargarConfigAvanzada',
    'cargarSedes', 'cargarProfesores', 'cargarPagos',
    'cargarBoletines', 'cargarHorarios', 'cargarIndicadores',
    'cargarLogros', 'cargarPensum', 'cargarAsignaturas',
    'cargarCursos', 'cargarSistemStats', 'cargarNotificacionesAdmin',
    'verificarSede', 'filtroSede',
]

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

injection_line = None
for i, l in enumerate(lines):
    if 'MODULOS INYECTADOS DESDE VISTAADMIN' in l:
        injection_line = i
        break

print(f"Injection starts at line: {injection_line+1 if injection_line else 'NOT FOUND'}")

# Look for top-level calls (not inside function defs) in injected section
print("\nTop-level calls to admin-only functions in injected section:")
in_function = 0
results = []
for i, l in enumerate(lines):
    if injection_line and i < injection_line:
        continue
    stripped = l.strip()
    # Track function depth (very rough)
    if re.match(r'^\s*(async\s+)?function\s+\w+', l) or re.match(r'\w+\s*=\s*(async\s+)?function', l):
        in_function += 1
    if stripped == '}':
        in_function = max(0, in_function - 1)
    
    if in_function == 0:
        for fn in admin_only_functions:
            if fn + '(' in stripped and not re.match(r'^\s*(async\s+)?function\s+', stripped) and not re.match(r'^//', stripped):
                results.append((i+1, fn, stripped[:80]))

for lineno, fn, text in results:
    print(f"  Line {lineno}: [{fn}] {text}")

print(f"\nTotal problematic calls: {len(results)}")
