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
    
    # Reportar el balance en puntos clave
    if line_num in [135, 161, 172, 600, 645, 1059, 1063, 1634, 1635]:
        print(f"Línea {line_num}: Balance = {balance}")
    
    if line_num > 135 and balance <= 0:
        print(f"!!! BALANCE BAJO CERO en línea {line_num}: {line.strip()}")
        # Imprimir las últimas 5 líneas para ver qué pasó
        for k in range(max(0, i-5), i+1):
            print(f"  {k+1}: {lines[k].strip()}")
        break
