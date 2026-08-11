import re

with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any lingering `_cfgEmpresa.` with `window._cfgEmpresa.`
# Only inside the config section area to avoid breaking unrelated variables
start_idx = content.find('async function initConfigAvanzada()')
end_idx = content.find('async function guardarInstitucion()')

if start_idx != -1 and end_idx != -1:
    section = content[start_idx:end_idx]
    
    # Replace Object.keys(_cfgEmpresa)
    section = section.replace('Object.keys(_cfgEmpresa)', 'Object.keys(window._cfgEmpresa)')
    # Replace _cfgEmpresa = await
    section = section.replace('_cfgEmpresa = await', 'window._cfgEmpresa = await')
    # Replace _cfgEmpresa.apariencia
    section = section.replace('_cfgEmpresa.apariencia', 'window._cfgEmpresa.apariencia')
    # Replace _cfgEmpresa[k]
    section = section.replace('_cfgEmpresa[k', 'window._cfgEmpresa[k')
    # Replace _cfgEmpresa.anio
    section = section.replace('_cfgEmpresa.anio', 'window._cfgEmpresa.anio')
    section = section.replace('_cfgEmpresa.jornada', 'window._cfgEmpresa.jornada')
    section = section.replace('_cfgEmpresa.periodos', 'window._cfgEmpresa.periodos')
    section = section.replace('_cfgEmpresa.nota_min', 'window._cfgEmpresa.nota_min')
    section = section.replace('_cfgEmpresa.nota_max', 'window._cfgEmpresa.nota_max')
    section = section.replace('_cfgEmpresa.nota_aprobatoria', 'window._cfgEmpresa.nota_aprobatoria')
    
    content = content[:start_idx] + section + content[end_idx:]

with open('VistaAdmin.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done fixing _cfgEmpresa inside VistaAdmin")
