import os

filepath = 'C:/Users/OMAR PEREZ/.gemini/antigravity/scratch/aparental/app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_child_dashboard = False
for i in range(len(lines)):
    if 'fun ChildDashboard' in lines[i]:
        in_child_dashboard = True
    elif 'fun MainScreen' in lines[i]:
        in_child_dashboard = False
    
    if in_child_dashboard and 'AnimatedKibooIcon' in lines[i]:
        lines[i] = lines[i].replace('AnimatedKibooIcon', 'AnimatedChildIcon')

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
