import os
import re

def fix_pwa():
    path = "src/components/PWAUpdateNotification.tsx"
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    if 'registration.update();' in content and 'return () => clearInterval' not in content:
        content = re.sub(
            r'if\s*\(registration\)\s*\{[\s\n]*setInterval\(\(\)\s*=>\s*\{[\s\n]*registration\.update\(\);[\s\n]*\},\s*30\s*\*\s*60\s*\*\s*1000\);[\s\n]*\}',
            'if (registration) {\n        const interval = setInterval(() => {\n          registration.update();\n        }, 30 * 60 * 1000);\n        return () => clearInterval(interval);\n      }',
            content
        )
        with open(path, 'w') as f: f.write(content)
        print(f"Fixed {path}")

def fix_robot_connection_context():
    path = "src/contexts/RobotConnectionContext.tsx"
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    # Looking for checkService implementation with nested Promise and timeout
    if 'const t = setTimeout(() => { ws.close(); resolve(false); }, timeout);' in content:
        # This is inside a function checkService, not a hook.
        # But wait, there is a checkService using fetch too.
        pass

def fix_quantum_dashboard():
    path = "src/components/dashboard/neural/QuantumRuntimeDashboard.tsx"
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    if 'setTimeout(() => {' in content and 'const timer =' not in content:
        # Add cleanup if it's inside a hook or track it
        pass

fix_pwa()
