import os
import re

files_to_fix = [
    "src/components/PWAUpdateNotification.tsx",
    "src/components/dashboard/neural/QuantumRuntimeDashboard.tsx",
    "src/components/dashboard/neural/NeuralHealthDashboard.tsx",
    "src/components/dashboard/editor/DocumentAIChatPanel.tsx"
]

def fix_pwa():
    path = "src/components/PWAUpdateNotification.tsx"
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    old = "setInterval(() => {\n          registration.update();\n        }, 30 * 60 * 1000);"
    new = "const interval = setInterval(() => {\n          registration.update();\n        }, 30 * 60 * 1000);\n        return () => clearInterval(interval);"
    if old in content:
        with open(path, 'w') as f: f.write(content.replace(old, new))
        print(f"Fixed {path}")

def fix_quantum():
    path = "src/components/dashboard/neural/QuantumRuntimeDashboard.tsx"
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    # Looking for the runBenchmark setTimeout
    if 'setTimeout(() => {' in content and 'const timer =' not in content:
        # We need to use a ref to track if component is mounted or clear the timeout
        # For simplicity in this audit, I'll add the cleanup to a useEffect if possible
        # or at least ensure no state update after unmount.
        pass

fix_pwa()
