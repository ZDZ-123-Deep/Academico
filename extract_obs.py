import re

with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_tag = '<div class="section" id="secObservador">'
start = content.find(start_tag)
if start != -1:
    end = content.find('<div class="section"', start + 1)
    if end != -1:
        observador_html = content[start:end]
        with open('observador_snippet.html', 'w', encoding='utf-8') as out:
            out.write(observador_html)
        print(f'Extracted HTML: {len(observador_html)} bytes')
    else:
        print('End not found')
else:
    print('Start not found')

# Also extract the JS functions for Observador
js_functions = ['cargarObservador', 'mostrarModalAnotacion', 'cerrarModalAnotacion', 'guardarAnotacion', 'eliminarAnotacion', 'imprimirObservador', 'verDetallesAnotacion', 'cerrarModalDetallesAnotacion']

js_snippet = ""
for func in js_functions:
    pattern = rf'async function {func}\([^)]*\)\s*{{.*?^}}'
    match = re.search(pattern, content, re.MULTILINE | re.DOTALL)
    if match:
        js_snippet += match.group(0) + '\n\n'
    else:
        pattern = rf'function {func}\([^)]*\)\s*{{.*?^}}'
        match = re.search(pattern, content, re.MULTILINE | re.DOTALL)
        if match:
            js_snippet += match.group(0) + '\n\n'
        else:
            print(f'Function {func} not found')

with open('observador_js.js', 'w', encoding='utf-8') as out:
    out.write(js_snippet)
print(f'Extracted JS: {len(js_snippet)} bytes')
