filepath = r'D:\PKM\medsign-ai\frontend\src\pages\DataCollection.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove orphaned lines 9016-9018 (1-indexed) which are at 0-indexed 9015-9017
# These are: '          return;\n' at index 9015, '        }\n' at index 9017
# We want to keep lines 0..9014 and then 9019..

# Find and remove the orphaned lines
new_lines = []
skip_until = -1
for i, line in enumerate(lines):
    if i >= 9015 and i <= 9017:
        # skip these orphaned lines
        continue
    new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Removed orphaned lines 9016-9018')