"""
Fix missing catch blocks by patching cargarAnuncios - close open try block
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# cargarAnuncios has try{ opened at line 3447 but closing } at line 3478
# The function closes at `).join('');` then just `}`
# We need to add catch before the closing brace of the function

# Find the cargarAnuncios function and fix it
old = """            `).join('');
        }

        function abrirNuevoAnuncio()"""

new = """            `).join('');
            } catch(e) { console.error('Error cargarAnuncios:', e); }
        }

        function abrirNuevoAnuncio()"""

if old in content:
    content = content.replace(old, new, 1)
    print("[OK] Fixed cargarAnuncios catch")
else:
    print("[WARN] Pattern not found, trying alternative")
    # Try finding it differently
    idx = content.find('async function cargarAnuncios()')
    if idx != -1:
        # Find the end of this function
        fn_snippet = content[idx:idx+2000]
        join_end = fn_snippet.find("`).join('');")
        if join_end != -1:
            abs_pos = idx + join_end + len("`).join('');")
            # Look at next 50 chars
            print(repr(content[abs_pos:abs_pos+100]))

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
