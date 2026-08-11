import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the access control block with one that has fallback defaults
# In case the company has not configured acceso_modulos in the DB yet,
# we default to true so the user can see them and test them.
old_block = """                if (emp.acceso_modulos) {
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
                }"""

new_block = """                // Fallback to true if undefined (para desarrollo/pruebas)
                const access = emp.acceso_modulos || { 
                    observador: true, anuncios: true, estudiantes: true, 
                    acudientes: true, reportes: true 
                };
                
                const btnObs = document.getElementById('btn-nav-observador');
                const btnAnun = document.getElementById('btn-nav-anuncios');
                const btnEst = document.getElementById('btn-nav-estudiantes');
                const btnAcud = document.getElementById('btn-nav-acudientes');
                const btnRep = document.getElementById('btn-nav-reportes');
                
                if (btnObs) btnObs.style.display = access.observador ? 'flex' : 'none';
                if (btnAnun) btnAnun.style.display = access.anuncios ? 'flex' : 'none';
                if (btnEst) btnEst.style.display = access.estudiantes ? 'flex' : 'none';
                if (btnAcud) btnAcud.style.display = access.acudientes ? 'flex' : 'none';
                if (btnRep) btnRep.style.display = access.reportes ? 'flex' : 'none';"""

content = content.replace(old_block, new_block)

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated access control defaults.")
