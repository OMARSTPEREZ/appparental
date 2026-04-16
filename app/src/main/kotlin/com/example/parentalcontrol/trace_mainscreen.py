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
    
    # Enfocarnos en MainScreen
    if 1062 <= line_num <= 1635:
        # Si hay un cambio o es una línea sospechosa
        if opens > 0 or closes > 0:
            # Imprimir balance ANTES de la línea
            print(f"Línea {line_num}: Balance (antes) = {balance - opens + closes} | +{opens} -{closes} | Final Balance = {balance} | {line.strip()}")
