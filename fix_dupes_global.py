"""
Global dedup: for any variable declared more than once in the main script block,
replace the 2nd, 3rd, etc. occurrences of `const X =` / `let X =` with just `X =`.
"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the main script block boundaries (the big one after <body>)
script_open = content.find('<script>', content.find('<body'))
script_close = content.find('</script>', script_open)

before_script = content[:script_open + len('<script>')]
js_block = content[script_open + len('<script>'):script_close]
after_script = content[script_close:]

# Find all declared variables and their positions inside js_block
from collections import defaultdict
decl_positions = defaultdict(list)
for m in re.finditer(r'\b(const|let)\s+(\w+)\s*=', js_block):
    decl_positions[m.group(2)].append(m.start())

# Find all that appear more than once
multi_decl = {k: v for k, v in decl_positions.items() if len(v) > 1}
print(f"Variables declared multiple times: {len(multi_decl)}")

# For each, we need to remove the keyword from all BUT the first declaration
# We do this by building a set of character positions to patch
patches = []  # list of (start, end, replacement)

for var_name, positions in multi_decl.items():
    for pos in positions[1:]:  # skip the first occurrence
        # Find the match at this exact position
        m = re.match(r'(const|let)\s+', js_block[pos:])
        if m:
            patches.append((pos, pos + len(m.group(0)), ''))

# Sort patches in reverse order so we can apply them without offset shifts
patches.sort(key=lambda x: x[0], reverse=True)
print(f"Patches to apply: {len(patches)}")

js_list = list(js_block)
for start, end, repl in patches:
    js_list[start:end] = list(repl)

js_fixed = ''.join(js_list)

# Reconstruct the file
content_fixed = before_script + js_fixed + after_script

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(content_fixed)

print(f"Saved. New size: {len(content_fixed)} bytes")
