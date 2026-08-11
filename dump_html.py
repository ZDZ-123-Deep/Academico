import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('VistaProfesor.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    start_act = -1
    start_acu = -1
    for i, l in enumerate(lines):
        if 'id="secActividades"' in l: start_act = i
        if 'id="secAcudientes"' in l: start_acu = i
        
    print('--- secActividades ---')
    if start_act != -1:
        for i in range(start_act, start_act + 10):
            print(lines[i].rstrip())
        
    print('\n--- secAcudientes ---')
    if start_acu != -1:
        for i in range(start_acu, start_acu + 10):
            print(lines[i].rstrip())
