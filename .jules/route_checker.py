import re
import os

app_tsx = open('src/App.tsx').read()
routes = re.findall(r'path="([^"]+)"', app_tsx)
pages = []
for root, dirs, files in os.walk('src/pages'):
    for file in files:
        if file.endswith('.tsx'):
            pages.append(os.path.join(root, file))

print(f"Total Routes in App.tsx: {len(routes)}")
print(f"Total Page Files: {len(pages)}")

# This is a bit complex for a regex, but let's see if we can find unreferenced pages
referenced_components = re.findall(r'element={<[^>]*?(\w+)\s*/?>}', app_tsx)
referenced_components += re.findall(r'element={<[^>]*?>\s*<(\w+)\s*/?>', app_tsx)

print(f"Referenced Components in App.tsx: {len(referenced_components)}")

unreferenced_pages = []
for p in pages:
    with open(p, 'r') as f:
        content = f.read()
        name_match = re.search(r'export default (\w+)', content)
        if not name_match:
            name_match = re.search(r'const (\w+) =', content)

        if name_match:
            name = name_match.group(1)
            if name not in referenced_components:
                unreferenced_pages.append(p)

print("\nPotentially Unreferenced Page Files:")
for up in unreferenced_pages:
    print(up)
