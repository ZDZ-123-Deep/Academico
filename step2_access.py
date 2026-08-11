import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

access_control_block = """
        cargarNotificaciones();

        // -- Aplicar control de acceso desde configuración de empresa --
        (async function aplicarAccesoModulos() {
            try {
                const res = await fetch(`${API}/empresa`);
                const emp = await res.json();
                if (emp.logo) {
                    const logo = document.getElementById('companyLogo');
                    if (logo) logo.src = emp.logo;
                }
                if (emp.nombre) document.title = 'EduGestión - ' + emp.nombre;
                if (emp.acceso_modulos) {
                    // Mostrar/ocultar botones inyectados según configuración admin
                    const btnObs = document.getElementById('btn-nav-observador');
                    const btnAnun = document.getElementById('btn-nav-anuncios');
                    const btnEst = document.getElementById('btn-nav-estudiantes');
                    const btnAcud = document.getElementById('btn-nav-acudientes');
                    const btnRep = document.getElementById('btn-nav-reportes');
                    
                    if (btnObs) btnObs.style.display = emp.acceso_modulos.observador ? 'flex' : 'none';
                    if (btnAnun) btnAnun.style.display = emp.acceso_modulos.anuncios ? 'flex' : 'none';
                    if (btnEst) btnEst.style.display = emp.acceso_modulos.estudiantes ? 'flex' : 'none';
                    if (btnAcud) btnAcud.style.display = emp.acceso_modulos.acudientes ? 'flex' : 'none';
                    if (btnRep) btnRep.style.display = emp.acceso_modulos.reportes ? 'flex' : 'none';
                }
            } catch(e) {
                console.warn('Control de acceso no pudo cargar:', e.message);
            }
        })();
"""

# Replace the specific init block
content = content.replace("        cargarNotificaciones();\n    </script>", access_control_block + "    </script>")

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added access control.")
