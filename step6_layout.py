import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# The injected modules
marker = "<!-- ========================================== -->\n    <!-- MÓDULOS INYECTADOS (SOLO LECTURA/REDUCIDO) -->"
if marker in content:
    parts = content.split(marker)
    if len(parts) >= 2:
        top_half = parts[0]
        # the injected block goes up to the closing </body> which is near the end
        # Since I appended it at the end, it should be right before </body>
        injected_and_bottom = marker + parts[1]
        
        # separate the injected block from the </body>
        injected_block = injected_and_bottom.replace("\n</body>", "").replace("\n</html>", "")
        
        # Remove it from its current position
        clean_content = content.replace(injected_block, "")
        
        # Insert it before <!-- MODAL CREAR TAREA -->
        if "<!-- MODAL CREAR TAREA -->" in clean_content:
            new_content = clean_content.replace("<!-- MODAL CREAR TAREA -->", injected_block + "\n\n    <!-- MODAL CREAR TAREA -->")
            with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Moved injected HTML inside the main-content wrapper.")
        else:
            print("Error: Could not find MODAL CREAR TAREA.")
else:
    print("Error: Could not find the injected modules marker.")
