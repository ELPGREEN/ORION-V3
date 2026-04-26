import sys

file_path = 'src/components/dashboard/neural/useVisionProcessing.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Move _grayRawBuffer outside processFrame
content = content.replace(
    '  // ═══ Phase 1: Grayscale → Gaussian Blur → Sobel (LAPIX pipeline) ═══\n  let _grayRawBuffer: Float32Array | null = null;',
    'let _grayRawBuffer: Float32Array | null = null;\n  // ═══ Phase 1: Grayscale → Gaussian Blur → Sobel (LAPIX pipeline) ═══'
)

with open(file_path, 'w') as f:
    f.write(content)
