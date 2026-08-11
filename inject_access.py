import os

payload = """
                    // --- Control de Acceso Global ---
                    if (emp && emp.acceso_modulos) {
                        try {
                            const tokenStr = localStorage.getItem('token_academico');
                            if (tokenStr) {
                                const rolActual = JSON.parse(atob(tokenStr.split('.')[1])).rol;
                                const accesos = emp.acceso_modulos;
                                const map = {
                                    'estudiantes': ['estudiantes'],
                                    'profesores': ['profesores'],
                                    'acudientes': ['acudientes'],
                                    'asignaturas': ['asignaturas'],
                                    'cursos': ['cursos'],
                                    'calificaciones': ['calificaciones'],
                                    'asistencia': ['asistencia'],
                                    'observador': ['observador'],
                                    'horarios': ['horarios', 'horario'],
                                    'horarioAtencion': ['horarioAtencion'],
                                    'pagos': ['pagos', 'cartera'],
                                    'boletines': ['boletines'],
                                    'anuncios': ['anuncios'],
                                    'logros': ['logros'],
                                    'indicadores': ['indicadores'],
                                    'pensum': ['pensum'],
                                    'reportes': ['reportes']
                                };
                                for (const modId in map) {
                                    const sections = map[modId];
                                    const isVisible = !accesos[modId] || accesos[modId].includes(rolActual);
                                    if (!isVisible) {
                                        sections.forEach(sec => {
                                            const btns = document.querySelectorAll(`button[onclick*="'${sec}'"]`);
                                            btns.forEach(btn => btn.style.display = 'none');
                                        });
                                    }
                                }
                            }
                        } catch(e) { console.error('Error aplicando control de acceso:', e); }
                    }
"""

files = ['VistaAdmin.html', 'VistaProfesor.html', 'VistaEstudiante.html', 'VistaPadre.html']

for html_file in files:
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if '// --- Control de Acceso Global ---' in content:
        print(f"Already injected in {html_file}")
        continue
        
    # Find injection point
    # We want to inject it right after the closing brace of `if (emp && emp.logo) { ... }`
    # which is inside `if (resEmpresa.ok) { const emp = await resEmpresa.json(); ... }`
    
    # Let's find the string: "const emp = await resEmpresa.json();"
    idx = content.find("const emp = await resEmpresa.json();")
    if idx == -1:
        print(f"Error: Could not find resEmpresa in {html_file}")
        continue
        
    # Find the next "}" that closes the "if (emp && emp.logo) { ... }" block
    # It usually ends with "boxShadow = 'none';\n                        }\n                    }"
    # So we look for "boxShadow = 'none';"
    idx_box = content.find("boxShadow = 'none';", idx)
    if idx_box == -1:
        print(f"Error: Could not find boxShadow in {html_file}")
        continue
        
    # Find the closing braces
    idx_brace1 = content.find("}", idx_box)
    idx_brace2 = content.find("}", idx_brace1 + 1)
    
    injection_pos = idx_brace2 + 1
    
    new_content = content[:injection_pos] + payload + content[injection_pos:]
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print(f"Injected into {html_file}")
