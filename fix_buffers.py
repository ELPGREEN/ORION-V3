import sys

file_path = 'src/components/dashboard/neural/useVisionProcessing.ts'
with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'if (!_blurBuffer || _blurBuffer.length !== w * h) _blurBuffer = new Float32Array(w * h);' in line:
        if 'gaussianBlur3x3' in ''.join(new_lines[-5:]):
             new_lines.append(line)
        else:
             # This is the nonMaxSuppression one, it should use _nmsBuffer
             new_lines.append(line.replace('_blurBuffer', '_nmsBuffer'))
    elif 'const out = _blurBuffer;' in line:
        if 'gaussianBlur3x3' in ''.join(new_lines[-10:]):
             new_lines.append(line)
        else:
             new_lines.append(line.replace('_blurBuffer', '_nmsBuffer'))
    else:
        new_lines.append(line)

with open(file_path, 'w') as f:
    f.writelines(new_lines)
