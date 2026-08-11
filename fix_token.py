import os

files = ['VistaEstudiante.html', 'VistaPadre.html']

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
    content = content.replace("localStorage.getItem('token_academico')", "sessionStorage.getItem('eduGestionToken')")
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
        
    print(f'Fixed {f}')
