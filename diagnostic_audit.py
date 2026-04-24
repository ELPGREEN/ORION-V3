import re

file_path = "src/lib/orion-complete-diagnostic.ts"
with open(file_path, "r") as f:
    content = f.read()

# Add version info to report
old_report_header = "🧠 ORION COMPLETE SYSTEM STATUS"
new_report_header = "🧠 ORION COMPLETE SYSTEM STATUS v21.2 (AquaMonkey v8.0)"

content = content.replace(old_report_header, new_report_header)

with open(file_path, "w") as f:
    f.write(content)

print("Diagnostic report updated with version info.")
