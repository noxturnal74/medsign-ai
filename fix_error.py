filepath = r'D:\PKM\medsign-ai\frontend\src\pages\DataCollection.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The exact string from the file (note: \\n means literal backslash-n in the file)
old = "              prev + `Error starting training: ${response.statusText}\\n`,"
new = """              const errorText = await response.text();
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
    print('SUCCESS: Replaced')
else:
    print('FAILED: Old string not found')
    idx = content.find('Error starting training')
    if idx >= 0:
        print('Found at index', idx)
        print('Context:', repr(content[idx-30:idx+80]))