"""
Remove all cargarDatosSeccion calls from VistaProfesor.html
These are admin-specific and don't exist in VistaProfesor.
Also look for other admin-specific global calls that crash on load.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all standalone cargarDatosSeccion('dashboard'); calls
# These are lines that ONLY contain that call (not inside a function)
original_len = len(content)

# Pattern: line that contains only cargarDatosSeccion(...)
# We replace the whole line with a comment
patterns_to_remove = [
    "        cargarDatosSeccion('dashboard');",
    "        cargarDatosSeccion('dashboard');\n",
    "cargarDatosSeccion('dashboard');",
]

for pat in patterns_to_remove:
    count = content.count(pat)
    if count > 0:
        content = content.replace(pat, "        // [removed: cargarDatosSeccion - admin only]")
        print(f"[OK] Removed {count} occurrences of: {pat[:50]}")

# Also check for other admin-only global calls that might crash
admin_global_calls = [
    "cargarDashboard();",
    "cargarConfigAvanzada();",
    "loaded['dashboard'] = false;",
]

for call in admin_global_calls:
    count = content.count(call)
    if count > 0:
        print(f"[INFO] Found {count} occurrences of admin call: {call}")

print(f"\nFile size: {original_len} -> {len(content)} bytes")

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved VistaProfesor.html")
