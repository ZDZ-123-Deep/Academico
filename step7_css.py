import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Patches for CSS classes to match VistaProfesor.css
patches = [
    ('class="table-responsive"', 'class="table-container"'),
    ('<table class="table">', '<table class="data-table">'),
    ('<h3>Observador del Alumno</h3>', '<div class="card-header"><h3 class="card-title"><i class="fas fa-eye"></i> Observador del Alumno</h3></div>'),
    ('<h3>Anuncios Institucionales</h3>', '<div class="card-header"><h3 class="card-title"><i class="fas fa-bullhorn"></i> Anuncios Institucionales</h3></div>'),
    ('<h3>Directorio de Estudiantes</h3>', '<div class="card-header"><h3 class="card-title"><i class="fas fa-user-graduate"></i> Directorio de Estudiantes</h3></div>'),
    ('<h3>Directorio de Acudientes</h3>', '<div class="card-header"><h3 class="card-title"><i class="fas fa-user-friends"></i> Directorio de Acudientes</h3></div>'),
    ('<h3>Reportes Académicos</h3>', '<div class="card-header"><h3 class="card-title"><i class="fas fa-chart-line"></i> Reportes Académicos</h3></div>'),
]

for old, new in patches:
    content = content.replace(old, new)

# Also fix the inner padding of the cards so the header touches the edges if needed
# Actually, the native card has `class="card"`, no inline style
content = content.replace('<div class="card" style="padding: 20px;">', '<div class="card" style="padding: 20px; overflow: hidden;">')

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated HTML classes to match VistaProfesor styles.")
