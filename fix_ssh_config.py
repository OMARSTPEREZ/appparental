import os

path = os.path.expanduser('~/.ssh/config')
content = '''Host github.com
  HostName github.com
  User git
  IdentityFile "C:\\Users\\OMAR PEREZ\\.ssh\\id_ed25519"
  IdentitiesOnly yes
  StrictHostKeyChecking no
'''

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
