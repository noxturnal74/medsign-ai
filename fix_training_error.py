import re

filepath = r'D:\PKM\medsign-ai\frontend\src\pages\DataCollection.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The exact string from line 8990
old = """prev + `Error starting training: ${response.statusText}\n`,"""

new = """const errorText = await response.text();
          let detail = "Gagal memulai training";
          try {
            const err = JSON.parse(errorText);
            detail = err.detail || err.message || "Gagal memulai training";
          } catch {
            detail = response.statusText || "Gagal memulai training";
          }
          prev + `Error starting training: ${detail}\n`,"""

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Old string NOT found - checking what\'s there...')
    # Search for the pattern
    m = re.search(r'prev \+ .Error starting training:.+\$\\{response.statusText\\}', content)
    if m:
        print('Pattern found, repr:', repr(content[m.start():m.end()]))
    else:
        # Try simpler
        m2 = re.search(r'Error starting training:', content)
        if m2:
            print('Found Error starting training at', m2.start())
            print('Context:', repr(content[m2.start()-50:m2.end()+50]))