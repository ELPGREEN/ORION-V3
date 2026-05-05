import re
import os

def find_references(directory):
    refs = set()
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                with open(os.path.join(root, file), 'r') as f:
                    content = f.read()
                    # Find lazy imports
                    lazy_matches = re.findall(r'import\("([^"]+)"\)', content)
                    for m in lazy_matches:
                        refs.add(os.path.basename(m))
                    # Find standard imports
                    import_matches = re.findall(r'import .* from "([^"]+)"', content)
                    for m in import_matches:
                        refs.add(os.path.basename(m))
    return refs

all_refs = find_references('src')
pages = []
for root, dirs, files in os.walk('src/pages'):
    for file in files:
        if file.endswith('.tsx'):
            pages.append(os.path.join(root, file))

unreferenced = []
for p in pages:
    basename = os.path.basename(p).replace('.tsx', '')
    referenced = False
    for ref in all_refs:
        if basename in ref:
            referenced = True
            break
    if not referenced:
        unreferenced.append(p)

print(f"Total Pages: {len(pages)}")
print(f"Unreferenced Pages: {len(unreferenced)}")
for up in unreferenced:
    print(up)
