filepath = r'D:\PKM\medsign-ai\frontend\src\pages\DataCollection.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_block = """        if (!response.ok) {

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

            (prev) => prev + `Error starting training: ${detail}\\n`,

          );

          setStatus("failed");

          setIsTraining(false);

          return;
        }"""

# Find the "if (!response.ok) {" line
start_idx = None
for i, line in enumerate(lines):
    if 'if (!response.ok) {' in line:
        start_idx = i
        break

if start_idx is not None:
    # Find setIsTraining(false); line
    for i in range(start_idx, min(len(lines), start_idx + 25)):
        if 'setIsTraining(false);' in lines[i]:
            # Replace lines start_idx through i+1 (the return statement line)
            new_lines = lines[:start_idx] + [new_block + '\n'] + lines[i+1:]
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print(f'Replaced lines {start_idx+1} through {i+1} (1-indexed)')
            break
else:
    print('Could not find if (!response.ok) {')