import os
import re

directory = 'C:/Users/OMAR PEREZ/.gemini/antigravity/scratch/aparental/app/src/main/kotlin/com/example/parentalcontrol'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.kt') and file != 'AnimatedKibooIcon.kt':
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = re.sub(r'(?<!\w)Icon\(', 'com.example.parentalcontrol.ui.AnimatedKibooIcon(', content)
            
            if new_content != content:
                print(f'Replacing in {path}')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
