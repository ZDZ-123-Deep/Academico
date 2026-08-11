"""
Fix all duplicate const/let declarations in VistaProfesor.html
by replacing the SECOND+ occurrence of any duplicated variable
from the injected sections with plain assignments (no const/let).
"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    prof = f.read()

# Find the injection point (where the injected JS starts)
injection_marker = '// =============================================\n// MODULOS INYECTADOS DESDE VISTAADMIN'
injection_start = prof.find(injection_marker)
if injection_start == -1:
    print("ERROR: Injection marker not found!")
    exit(1)

print(f"Injection point found at: {injection_start}")

original_script = prof[:injection_start]
injected_part = prof[injection_start:]

# Find all variables declared in the ORIGINAL script (before injection)
original_vars = set(re.findall(r'\b(?:const|let)\s+(\w+)\b', original_script))
print(f"Variables in original script: {len(original_vars)}")

# In the injected part, replace const/let X = with X = if X was already declared
def dedup(js_block, existing):
    def replacer(m):
        keyword = m.group(1)
        var_name = m.group(2)
        rest = m.group(3)
        if var_name in existing:
            return f'{var_name} ={rest}'
        return m.group(0)
    return re.sub(r'\b(const|let)\s+(\w+)\s*(=)', replacer, js_block)

fixed_injected = dedup(injected_part, original_vars)

# Count how many replacements were made
original_count = len(re.findall(r'\b(?:const|let)\s+\w+\s*=', injected_part))
fixed_count = len(re.findall(r'\b(?:const|let)\s+\w+\s*=', fixed_injected))
print(f"Const/let declarations in injected: {original_count} -> {fixed_count}")

prof = original_script + fixed_injected

with open('VistaProfesor.html', 'w', encoding='utf-8') as f:
    f.write(prof)
print("Saved VistaProfesor.html")
