with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    for i, l in enumerate(f.readlines()):
        if 'mostrarSeccion(\'cursos' in l:
            print(i+1, l.strip())
