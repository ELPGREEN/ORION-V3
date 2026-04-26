import sys

file_path = 'src/components/dashboard/neural/useVisionProcessing.ts'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace('let _grayRawBuffer: Float32Array | null = null;\n', '')
content = content.replace('let _blurBuffer: Float32Array | null = null;', 'let _blurBuffer: Float32Array | null = null;\nlet _grayRawBuffer: Float32Array | null = null;')

with open(file_path, 'w') as f:
    f.write(content)
