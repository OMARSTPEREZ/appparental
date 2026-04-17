content = open('app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt', encoding='utf-8').read()

lines = content.split('\n')
result = []
skip = False
i = 0
while i < len(lines):
    line = lines[i]
    if 'DashboardStat' in line and ('Total Apps' in line or 'Bloqueadas' in line):
        i += 1
        continue
    # Skip the wrapping Row that ONLY contains DashboardStat items
    if 'Spacer(Modifier.height(20.dp))' in line:
        # check if next few lines are the DashboardStat row
        if i+1 < len(lines) and 'Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp))' in lines[i+1]:
            i += 5  # skip Row opening, 2 stats, closing brace
            continue
    result.append(line)
    i += 1

open('app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt', 'w', encoding='utf-8').write('\n'.join(result))
print('Done - removed stats block')
