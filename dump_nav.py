import os

for html_file in ['VistaAdmin.html', 'VistaProfesor.html', 'VistaEstudiante.html', 'VistaPadre.html']:
    print(f"\n--- {html_file} ---")
    with open(html_file, 'r', encoding='utf-8') as f:
        for l in f.readlines():
            if 'mostrarSeccion(' in l and '<button' in l:
                print(l.strip())
