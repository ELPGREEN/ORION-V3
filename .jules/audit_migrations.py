import os
import re

migrations_dir = 'supabase/migrations'
migrations = [f for f in os.listdir(migrations_dir) if f.endswith('.sql')]

results = []

for m in migrations:
    path = os.path.join(migrations_dir, m)
    with open(path, 'r') as f:
        content = f.read()

    has_if_not_exists = 'IF NOT EXISTS' in content.upper()
    has_drop_policy = 'DROP POLICY IF EXISTS' in content.upper()
    has_create_table = 'CREATE TABLE' in content.upper()
    has_create_policy = 'CREATE POLICY' in content.upper()

    # Table idempotency
    table_ok = True
    if has_create_table and not has_if_not_exists:
        table_ok = False

    # Policy idempotency
    policy_ok = True
    if has_create_policy and not has_drop_policy:
        policy_ok = False

    results.append({
        'name': m,
        'table_ok': table_ok,
        'policy_ok': policy_ok,
        'has_table': has_create_table,
        'has_policy': has_create_policy
    })

total = len(results)
non_idempotent_tables = [r['name'] for r in results if r['has_table'] and not r['table_ok']]
non_idempotent_policies = [r['name'] for r in results if r['has_policy'] and not r['policy_ok']]

print(f"Total Migrations: {total}")
print(f"Migrations with non-idempotent CREATE TABLE: {len(non_idempotent_tables)}")
print(f"Migrations with non-idempotent CREATE POLICY: {len(non_idempotent_policies)}")

print("\nRecent non-idempotent Table Migrations:")
for m in sorted(non_idempotent_tables, reverse=True)[:10]:
    print(f"- {m}")

print("\nRecent non-idempotent Policy Migrations:")
for m in sorted(non_idempotent_policies, reverse=True)[:10]:
    print(f"- {m}")
