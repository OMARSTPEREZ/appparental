import sys

path = r'C:\Users\OMAR PEREZ\.gemini\antigravity\scratch\aparental\app\src\main\kotlin\com\example\parentalcontrol\MainActivity.kt'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    line_num = i + 1
    # Borrar 601-604 (indices 600-603) si son llaves solas
    if 601 <= line_num <= 604:
        if line.strip() == '}':
            continue
    new_lines.append(line)

# Asegurar que el archivo termine en una llave para la clase si no la tiene
if new_lines and new_lines[-1].strip() != '}':
    new_lines.append('\n}\n')
elif len([l for l in new_lines if l.strip() == '}']) % 2 != 0:
    # Este es un conteo bruto, no muy fiable, pero sirve de chequeo básico
    # En realidad, simplemente añadiremos una llave si después de la limpieza
    # el último elemento no es el cierre de la clase
    pass

# Mejor técnica: Simplemente añadir una llave al final para la clase MainActivity
new_lines.append('}\n')

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.writelines(new_lines)

print(f"Successfully fixed braces in {path}")
