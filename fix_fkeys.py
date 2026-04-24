import os
import re

migrations_dir = 'supabase/migrations'
files = [
    '20260206154141_d2605596-1d89-4130-be27-fb556c4a2bae.sql',
    '20260320052520_826d356d-3a92-47fb-8936-1da3995eb653.sql',
    '20260331192330_f3226700-6488-4800-a71e-85a9d8ecc188.sql',
    '20260331192905_4a8a5a62-87ac-475c-8859-c28a58c20da3.sql',
    '20260331201953_bfaf62b9-1c3c-4fde-a501-8322eb62b175.sql',
    '20260331202203_1c3a8282-4359-4066-9177-0afaf3c4c34c.sql',
    '20260408220237_04f7d8ea-6219-40d4-a011-f40f5f178373.sql'
]

for filename in files:
    filepath = os.path.join(migrations_dir, filename)
    if not os.path.exists(filepath): continue
    with open(filepath, 'r') as f: content = f.read()
    if 'DO $$' in content: continue

    match = re.search(r'INSERT INTO|UPDATE|DELETE', content, re.IGNORECASE)
    if not match: continue

    uuid_match = re.search(r"'([0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12})'", content)
    if not uuid_match: continue

    uuid = uuid_match.group(1)
    if uuid == '00000000-0000-0000-0000-000000000000': continue # Skip nulled UUIDs if any

    start = match.start()
    new_content = content[:start] + f"DO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '{uuid}') THEN\n    {content[start:].strip()}\n  END IF;\nEND $$;\n"
    with open(filepath, 'w') as f: f.write(new_content)
    print(f"Fixed {filename}")
