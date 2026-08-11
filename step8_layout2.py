import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# The injected block
marker = "<!-- ========================================== -->\n    <!-- MÓDULOS INYECTADOS (SOLO LECTURA/REDUCIDO) -->"
end_marker = "<!-- MODAL CREAR TAREA -->"

if marker in content and end_marker in content:
    # 1. Extract the injected block
    start_idx = content.find(marker)
    end_idx = content.find(end_marker)
    injected_block = content[start_idx:end_idx].strip()
    
    # 2. Remove the injected block from its current location
    content_clean = content[:start_idx] + content[end_idx:]
    
    # 3. Find the exact </div> that closes main-content.
    # It is right before <!-- MODAL CREAR TAREA --> in the clean content.
    # The clean content around there looks like:
    #         </div>
    #     </div>
    #
    #     <!-- MODAL CREAR TAREA -->
    
    # We will search backwards from <!-- MODAL CREAR TAREA --> for the first </div>
    # Actually, let's just replace "    </div>\n\n    <!-- MODAL CREAR TAREA -->" 
    # with "        " + injected_block + "\n    </div>\n\n    <!-- MODAL CREAR TAREA -->"
    
    target = "    </div>\n\n    <!-- MODAL CREAR TAREA -->"
    if target in content_clean:
        new_content = content_clean.replace(target, "    " + injected_block + "\n" + target)
        with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully moved injected modules INSIDE main-content!")
    else:
        # Fallback: maybe the spacing is slightly different
        print("Target string not found precisely. Trying fallback.")
        parts = content_clean.split("<!-- MODAL CREAR TAREA -->")
        if len(parts) == 2:
            left_part = parts[0]
            # Find the last </div> in the left part
            last_div_idx = left_part.rfind("</div>")
            if last_div_idx != -1:
                new_left = left_part[:last_div_idx] + "\n" + injected_block + "\n    </div>\n" + left_part[last_div_idx+6:]
                new_content = new_left + "<!-- MODAL CREAR TAREA -->" + parts[1]
                with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print("Fallback successful!")
            else:
                print("Fallback failed: no </div> found.")
else:
    print("Markers not found.")
