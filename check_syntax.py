import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from html.parser import HTMLParser

class ScriptExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_script = False
        self.data = ''
    def handle_starttag(self, tag, attrs):
        if tag == 'script' and not any(a[0]=='src' for a in attrs):
            self.in_script = True
    def handle_endtag(self, tag):
        if tag == 'script' and self.in_script:
            self.in_script = False
    def handle_data(self, data):
        if self.in_script:
            self.data += data

p = ScriptExtractor()
with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    p.feed(f.read())

with open('temp_profesor.js', 'w', encoding='utf-8') as f:
    f.write(p.data)

print(f'Script length: {len(p.data)} bytes')
result = os.system('node -c temp_profesor.js')
if result == 0:
    print('SYNTAX OK!')
else:
    print('SYNTAX ERROR - check output above')
