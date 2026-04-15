with open('app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt', 'r', encoding='utf-8') as f:
    content = f.read()

# Check what theme-related dropdown items exist
items_to_remove = [
    ('M. Ni\u00f1o \ud83d\udc66', 'THEME_BOY'),
    ('M. Ni\u00f1a \ud83d\udc67', 'THEME_GIRL'),
    ('M. Oscuro \ud83c\udf19', 'THEME_DARK'),
]

changed = False
for label, theme_const in items_to_remove:
    if label in content:
        # Find the DropdownMenuItem block containing this label and remove it
        start = content.find(f'DropdownMenuItem(\n                                        text = {{ Text("{label}"')
        if start == -1:
            start = content.find(f'DropdownMenuItem(\n                                    text = {{ Text("{label}"')
        if start != -1:
            # Find the end of this DropdownMenuItem block
            end = content.find(')\n', start)
            end = content.find(')\n', end + 1)  # Get closing paren
            if end != -1:
                content = content[:start] + content[end+2:]
                changed = True
                print(f'Removed: {label}')

if changed:
    with open('app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done!')
else:
    # Check current state of dropdown
    idx = content.find('DropdownMenu(')
    if idx != -1:
        print('Current dropdown content:')
        print(repr(content[idx:idx+1000]))
