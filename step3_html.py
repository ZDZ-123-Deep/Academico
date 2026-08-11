import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

html_structures = """
    <!-- ========================================== -->
    <!-- MÓDULOS INYECTADOS (SOLO LECTURA/REDUCIDO) -->
    <!-- ========================================== -->

    <!-- SECCION: OBSERVADOR -->
    <div id="secObservador" class="section">
        <div class="card" style="padding: 20px;">
            <h3>Observador del Alumno</h3>
            <p>Busque un estudiante para consultar su historial de observaciones.</p>
            <div style="margin-top:20px;">
                <label>Seleccione Curso</label>
                <select id="obsPlanillaCursoClean" class="form-control" onchange="buscarEstudiantesObsClean(this.value)">
                    <option value="">Cargando cursos...</option>
                </select>
                <br>
                <label>Seleccione Estudiante</label>
                <select id="obsSelectEstudianteClean" class="form-control" onchange="verObservacionesEstudianteClean(this.value)">
                    <option value="">Seleccione primero el curso</option>
                </select>
            </div>
            <div id="obsListaClean" style="margin-top:20px; border-top:1px solid var(--border); padding-top:20px;">
                <!-- Aquí se listan las observaciones -->
            </div>
        </div>
    </div>

    <!-- SECCION: ANUNCIOS -->
    <div id="secAnuncios" class="section">
        <div class="card" style="padding: 20px;">
            <h3>Anuncios Institucionales</h3>
            <div id="anunciosListaClean" style="margin-top:20px;">
                <div style="text-align:center;padding:20px;color:var(--gray-400)">Cargando anuncios...</div>
            </div>
        </div>
    </div>

    <!-- SECCION: ESTUDIANTES (SOLO LECTURA) -->
    <div id="secEstudiantes" class="section">
        <div class="card" style="padding: 20px;">
            <h3>Directorio de Estudiantes</h3>
            <div class="table-responsive" style="margin-top:20px;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Estudiante</th>
                            <th>ID</th>
                            <th>Curso</th>
                            <th>Documento</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="tablaEstudiantesClean">
                        <tr><td colspan="5" style="text-align:center">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- SECCION: ACUDIENTES (SOLO LECTURA) -->
    <div id="secAcudientes" class="section">
        <div class="card" style="padding: 20px;">
            <h3>Directorio de Acudientes</h3>
            <div class="table-responsive" style="margin-top:20px;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Identificación</th>
                            <th>Teléfono</th>
                            <th>Correo</th>
                            <th>Formación</th>
                        </tr>
                    </thead>
                    <tbody id="tablaAcudientesClean">
                        <tr><td colspan="5" style="text-align:center">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- SECCION: REPORTES -->
    <div id="secReportes" class="section">
        <div class="card" style="padding: 20px;">
            <h3>Reportes Académicos</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top:20px;">
                <div style="padding:15px; border-radius:8px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2)">
                    <div style="font-size:0.85rem; color:var(--gray-500)">Tasa de Aprobación</div>
                    <div id="repTasaAprobacionClean" style="font-size:1.5rem; font-weight:bold; color:var(--text-primary)">--%</div>
                </div>
                <div style="padding:15px; border-radius:8px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2)">
                    <div style="font-size:0.85rem; color:var(--gray-500)">Estudiantes en Riesgo</div>
                    <div id="repEnRiesgoClean" style="font-size:1.5rem; font-weight:bold; color:var(--text-primary)">--</div>
                </div>
                <div style="padding:15px; border-radius:8px; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2)">
                    <div style="font-size:0.85rem; color:var(--gray-500)">Tasa Asistencia Media</div>
                    <div id="repAsistenciaClean" style="font-size:1.5rem; font-weight:bold; color:var(--text-primary)">--%</div>
                </div>
            </div>
        </div>
    </div>
"""

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Inject right before </body>
content = content.replace("</body>", html_structures + "\n</body>")

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected clean HTML structures.")
