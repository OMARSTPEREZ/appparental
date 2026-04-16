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
    
    if 1300 <= line_num <= 1635:
        if opens > 0 or closes > 0:
            print(f"Línea {line_num}: ({opens} {closes}) -> Balance {balance} | {line.strip()}")
