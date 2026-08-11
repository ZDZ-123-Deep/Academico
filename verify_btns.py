with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    for l in f.readlines():
        if 'mostrarSeccion' in l and '<button' in l:
            print(l.strip())
