import os

file_path = 'app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'ÃƒÆ’Ã‚Â³': 'ó',
    'ÃƒÆ’Ã‚Â¡': 'á',
    'ÃƒÆ’Ã‚Â­': 'í',
    'ÃƒÆ’Ã‚Â±': 'ñ',
    'ÃƒÆ’Ã‚Âº': 'ú',
    'ÃƒÆ’Ã‚Â©': 'é',
    'Ãƒâ€šÃ‚Â¿': '¿',
    'Ãƒâ€šÃ‚Â¡': '¡',
    'ÃƒÆ’Ã¢â‚¬Ëœ': 'Ñ',
    'ÃƒÆ’Ã¢â‚¬Å“': 'Ó',
    'ÃƒÆ’Ã…Â¡': 'Ú',
    'ÃƒÂ¢Ã…Â¡Ã¢â€žÂ¢ÃƒÂ¯Ã‚Â¸Ã‚Â ': '⚙️',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â³': '💳',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã‚Â ': '🔒',
    'ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Âª': '🚪',
    'ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ': '🤖',
    'ÃƒÂ¢Ã‚Â Ã‚Â±ÃƒÂ¯Ã‚Â¸Ã‚Â ': '⏱️',
    'ÃƒÂ°Ã…Â¸Ã…â€™Ã…Â¸': '🌟',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â ': '🛡️',
    'ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â«': '🚫',
    'ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“': '✔',
    'ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦': '✅',
    'ÃƒÂ¢Ã…â€œÃ‚Â¨': '✨'
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Limpieza completada')
