import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace catch blocks with UI alerts
patches = [
    (
        "} catch(e) { console.error('Error cargando estudiantes:', e); }", 
        "} catch(e) { console.error(e); document.getElementById('tablaEstudiantesClean').innerHTML = `<tr><td colspan='5' style='color:red'>ERROR: ${e.message}</td></tr>`; }"
    ),
    (
        "} catch(e) { console.error('Error cargando anuncios:', e); }",
        "} catch(e) { console.error(e); document.getElementById('anunciosListaClean').innerHTML = `<div style='color:red'>ERROR: ${e.message}</div>`; }"
    ),
    (
        "} catch(e) { console.error('Error cargando reportes:', e); }",
        "} catch(e) { console.error(e); document.getElementById('repEnRiesgoClean').innerHTML = `<span style='color:red'>ERR</span>`; }"
    ),
    (
        "} catch(e) { console.error('Error cargando acudientes:', e); }",
        "} catch(e) { console.error(e); document.getElementById('tablaAcudientesClean').innerHTML = `<tr><td colspan='5' style='color:red'>ERROR: ${e.message}</td></tr>`; }"
    )
]

for old, new in patches:
    content = content.replace(old, new)

# Also add debug alerts if the array is empty
estudiantes_old = "tbody.innerHTML = (data.estudiantes || []).map(e => `"
estudiantes_new = """
        if (!data.estudiantes || data.estudiantes.length === 0) {
            tbody.innerHTML = `<tr><td colspan='5'>No se encontraron estudiantes en la DB. (data.estudiantes=${typeof data.estudiantes}, data=${JSON.stringify(data).substring(0,50)})</td></tr>`;
            return;
        }
        tbody.innerHTML = data.estudiantes.map(e => `
"""
content = content.replace(estudiantes_old, estudiantes_new)

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added UI debug information.")
