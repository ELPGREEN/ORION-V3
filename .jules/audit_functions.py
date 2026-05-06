import os
import re

functions_dir = 'supabase/functions'
functions = [f for f in os.listdir(functions_dir) if os.path.isdir(os.path.join(functions_dir, f)) and f != '_shared']

results = []

for func in functions:
    index_path = os.path.join(functions_dir, func, 'index.ts')
    if not os.path.exists(index_path):
        continue

    with open(index_path, 'r') as f:
        content = f.read()

    has_cors = 'Access-Control-Allow-Origin' in content
    has_options = 'req.method === "OPTIONS"' in content or 'req.method === \'OPTIONS\'' in content or 'if (method === "OPTIONS")' in content
    # Look for common JWT verification patterns
    has_jwt_verify = 'auth.getUser' in content or 'verify_jwt = true' in content or 'verify_jwt: true' in content or 'createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY")' in content
    has_zod = 'zod' in content.lower() or 'z.object' in content
    has_gemini_rot = 'GEMINI_API_KEY' in content and ('_2' in content or 'keys' in content)

    results.append({
        'name': func,
        'cors': has_cors,
        'options': has_options,
        'jwt': has_jwt_verify,
        'zod': has_zod,
        'gemini_rot': has_gemini_rot
    })

print("| Function | CORS | OPTIONS | JWT | Zod | Gemini Rot |")
print("|---" * 6 + "|")
for r in sorted(results, key=lambda x: x['name']):
    print(f"| {r['name']} | {'✅' if r['cors'] else '❌'} | {'✅' if r['options'] else '❌'} | {'✅' if r['jwt'] else '❌'} | {'✅' if r['zod'] else '❌'} | {'✅' if r['gemini_rot'] else '❌'} |")
