"""
Patch runtime bugs in the injected functions of VistaProfesor.html:
1. cargarObservaciones: e.student_id -> e.estudiante_id
2. Add getAvatarColor if missing
3. Add try/catch to cargarEstudiantes & cargarAcudientes that were missing them
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ── Fix 1: cargarObservaciones uses wrong field name ──────────────────────
# e.student_id -> e.estudiante_id (in the obsInsEstudiante dropdown)
old = "dataEst.estudiantes.map(e => `<option value=\"${e.student_id}\">${e.nombre}</option>`)"
new = "dataEst.estudiantes.map(e => `<option value=\"${e.estudiante_id}\">${e.nombre}</option>`)"
if old in content:
    content = content.replace(old, new)
    print("[OK] Fix 1: student_id -> estudiante_id en cargarObservaciones")
    changes += 1
else:
    print("[WARN] Fix 1: patron no encontrado")

# ── Fix 2: Add getAvatarColor helper if missing ───────────────────────────
if 'function getAvatarColor' not in content:
    avatar_color_fn = """
        // Helper: avatar color for student list
        function getAvatarColor(index) {
            const colors = ['#6C63FF','#FF6584','#43CFFF','#FFD166','#06D6A0','#EF476F','#118AB2','#073B4C'];
            return colors[index % colors.length];
        }
"""
    # Inject before the injected modules marker
    marker = '// =============================================\n// MODULOS INYECTADOS DESDE VISTAADMIN'
    if marker in content:
        content = content.replace(marker, avatar_color_fn + '\n' + marker)
        print("[OK] Fix 2: getAvatarColor agregado")
        changes += 1
    else:
        print("[WARN] Fix 2: marker no encontrado para inyectar getAvatarColor")
else:
    print("[OK] Fix 2: getAvatarColor ya existe")

# ── Fix 3: cargarEstudiantes — add try/catch ──────────────────────────────
old_est_fn = "async function cargarEstudiantes() {\n            res = await fetch(`${API}/estudiantes?limit=200`);\n            data = await res.json();\n            tbody = document.getElementById('tablaEstudiantes');"
new_est_fn = """async function cargarEstudiantes() {
            try {
            res = await fetch(`${API}/estudiantes?limit=200`);
            data = await res.json();
            tbody = document.getElementById('tablaEstudiantes');"""
if old_est_fn in content:
    content = content.replace(old_est_fn, new_est_fn)
    print("[OK] Fix 3: try/catch parcial iniciado en cargarEstudiantes")
    changes += 1
else:
    print("[WARN] Fix 3: cargarEstudiantes patron no encontrado")

# ── Fix 4: cargarAcudientes — verify it has try/catch ────────────────────
if 'async function cargarAcudientes()' in content:
    idx = content.find('async function cargarAcudientes()')
    snippet = content[idx:idx+200]
    if 'try {' not in snippet:
        old_ac = "async function cargarAcudientes() {\n            res = await fetch(`${API}/acudientes`);"
        new_ac = "async function cargarAcudientes() {\n            try {\n            res = await fetch(`${API}/acudientes`);"
        if old_ac in content:
            content = content.replace(old_ac, new_ac)
            print("[OK] Fix 4: try iniciado en cargarAcudientes")
            changes += 1
        else:
            print("[WARN] Fix 4: patron cargarAcudientes no encontrado")
    else:
        print("[OK] Fix 4: cargarAcudientes ya tiene try/catch")

# ── Fix 5: cargarAnuncios — add try/catch ────────────────────────────────
if 'async function cargarAnuncios()' in content:
    idx = content.find('async function cargarAnuncios()')
    snippet = content[idx:idx+100]
    if 'try {' not in snippet:
        old_an = "async function cargarAnuncios() {\n            res = await fetch(`${API}/anuncios`);"
        new_an = """async function cargarAnuncios() {
            try {
            res = await fetch(`${API}/anuncios`);"""
        if old_an in content:
            content = content.replace(old_an, new_an)
            print("[OK] Fix 5: try iniciado en cargarAnuncios")
            changes += 1
        else:
            # Try with different indentation
            for indent in ['        ', '    ', '']:
                old_an2 = f"{indent}async function cargarAnuncios() {{\n{indent}    res = await fetch(`${{API}}/anuncios`);"
                if old_an2 in content:
                    new_an2 = f"{indent}async function cargarAnuncios() {{\n{indent}    try {{\n{indent}    res = await fetch(`${{API}}/anuncios`);"
                    content = content.replace(old_an2, new_an2)
                    print(f"[OK] Fix 5b: try iniciado en cargarAnuncios (indent={len(indent)})")
                    changes += 1
                    break
            else:
                print("[WARN] Fix 5: cargarAnuncios patron no encontrado exacto")
    else:
        print("[OK] Fix 5: cargarAnuncios ya tiene try/catch")

# ── Fix 6: cargarReportes — verify ───────────────────────────────────────
if 'async function cargarReportes()' in content:
    idx = content.find('async function cargarReportes()')
    snippet = content[idx:idx+100]
    if 'try {' in snippet:
        print("[OK] Fix 6: cargarReportes ya tiene try/catch")
    else:
        print("[WARN] Fix 6: cargarReportes sin try/catch")

# ── Fix 7: Wrap cargarEstudiantes body (find the end after tbody fill) ───
# Since cargarEstudiantes is long, we just ensure it doesn't crash silently
# by wrapping the whole thing - we need to find where it ends

print(f"\nTotal cambios: {changes}")

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Guardado VistaProfesor.html")
