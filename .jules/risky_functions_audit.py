import os
import re

functions_dir = 'supabase/functions'
functions = [f for f in os.listdir(functions_dir) if os.path.isdir(os.path.join(functions_dir, f)) and f != '_shared']

# Read config.toml to find verify_jwt = false
with open('supabase/config.toml', 'r') as f:
    config_content = f.read()

risky_functions = []

for func in functions:
    index_path = os.path.join(functions_dir, func, 'index.ts')
    if not os.path.exists(index_path):
        continue

    # Check if verify_jwt is false in config.toml for this function
    # Pattern: [functions.name] \n verify_jwt = false
    pattern = rf'\[functions\.{re.escape(func)}\]\s+verify_jwt = false'
    is_jwt_disabled = re.search(pattern, config_content) is not None

    if is_jwt_disabled:
        with open(index_path, 'r') as f:
            content = f.read()

        # Check for internal auth patterns
        has_internal_auth = 'auth.getUser' in content or 'supabaseAdmin.auth' in content or 'headers.get("authorization")' in content

        if not has_internal_auth:
            risky_functions.append(func)

print(f"Total functions with verify_jwt = false: {len(re.findall(r'verify_jwt = false', config_content))}")
print(f"Functions with verify_jwt = false AND no detected internal auth: {len(risky_functions)}")
for rf in risky_functions:
    print(f"- {rf}")
