import re

with open('VistaAdmin.html', 'r', encoding='utf-8') as f:
    content = f.read()

sections = re.findall(r'<div class="section"[^>]*id="sec([^"]+)"', content)
print('Sections in Admin:', sections)

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    prof = f.read()
prof_sections = re.findall(r'<div class="section"[^>]*id="sec([^"]+)"', prof)
print('Sections in Prof:', prof_sections)
