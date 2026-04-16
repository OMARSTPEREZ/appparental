import sys

path = r'C:\Users\OMAR PEREZ\.gemini\antigravity\scratch\aparental\app\src\main\kotlin\com\example\parentalcontrol\MainActivity.kt'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    line_num = i + 1
    opens = line.count('{')
    closes = line.count('}')
    balance += opens - closes
    # Si el balance es 0, la clase MainActivity se ha cerrado
    if line_num > 135 and balance == 0:
        print(f"La clase MainActivity se cerró en la línea {line_num}")
        # Mostrar el contexto
        for j in range(max(0, i-2), min(len(lines), i+3)):
            print(f"{j+1}: {lines[j].strip()}")
        break
else:
    print(f"La clase nunca se cerró. Balance final: {balance}")

# Buscar funciones que usen packageManager y estén fuera del balance
if balance < 1:
    print("\nBuscando referencias a packageManager fuera de la clase:")
    for i, line in enumerate(lines):
        if "packageManager" in line and i + 1 > line_num:
            print(f"Línea {i+1}: {line.strip()}")
