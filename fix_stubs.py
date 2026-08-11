"""
The injected admin code uses a 'loaded' cache object and cargarDatosSeccion.
Neither exists in VistaProfesor. Fix by:
1. Replacing all admin-only patterns
2. Adding a stub 'loaded' object at the top of injected section
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add a 'loaded' stub right at the start of injected modules
marker = "// =============================================\n// MODULOS INYECTADOS DESDE VISTAADMIN"
stub = """// =============================================
// MODULOS INYECTADOS DESDE VISTAADMIN
// Stub for admin-only cache variables
var loaded = {};
function cargarDatosSeccion(secId) {
    // Stub: in VistaProfesor we call each function directly
    console.log('[stub] cargarDatosSeccion called for:', secId);
}"""

if marker in content:
    content = content.replace(marker, stub, 1)
    print("[OK] Added 'loaded' stub and cargarDatosSeccion stub")
else:
    print("[WARN] Marker not found")

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved.")
