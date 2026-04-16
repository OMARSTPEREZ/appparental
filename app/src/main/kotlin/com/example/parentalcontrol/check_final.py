import sys

path = r'C:\Users\OMAR PEREZ\.gemini\antigravity\scratch\aparental\app\src\main\kotlin\com\example\parentalcontrol\MainActivity.kt'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Buscar 'this' en contextos de Composables
# Buscamos todas las líneas entre MainScreen y LocationTrackerScreen
suspicious_this = []
for i, line in enumerate(lines):
    line_num = i + 1
    if (1062 <= line_num <= 1634) or (2719 <= line_num <= 2777):
        if " this" in line or "(this)" in line or "=this" in line:
            if "@MainActivity" not in line:
                suspicious_this.append((line_num, line.strip()))

if suspicious_this:
    print("Found potential incorrect 'this' usages in Composables:")
    for num, content in suspicious_this:
        print(f"Línea {num}: {content}")
else:
    print("No obvious incorrect 'this' usages found.")

# Verificar el final del archivo para el balance de llaves
print(f"\nVerificando el final del archivo (Líneas {len(lines)-5} a {len(lines)}):")
for i in range(max(0, len(lines)-5), len(lines)):
    print(f"{i+1}: {lines[i].strip()}")
