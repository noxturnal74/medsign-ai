filepath = r'D:\PKM\medsign-ai\frontend\src\pages\DataCollection.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = """        if (!response.ok) {

          setLogs(

            (prev) =>

              prev + `Error starting training: ${response.statusText}\n`,

          );

          setStatus("failed");

          setIsTraining(false);

          return;
        }"""

new = """        if (!response.ok) {

          // Parse error detail from backend JSON
          const errorText = await response.text();

          let detail = "Gagal memulai training";

          try {

            const err = JSON.parse(errorText);

            detail = err.detail || err.message || "Gagal memulai training";

          } catch {

            detail = response.statusText || "Gagal memulai training";

          }

          setLogs(

            (prev) => prev + `Error starting training: ${detail}\n`,

          );

          setStatus("failed");

          setIsTraining(false);

          return;
        }"""

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Replaced')
else:
    print('FAILED: Old string not found')
    idx = content.find('if (!response.ok)')
    if idx >= 0:
        print('Found at index', idx)