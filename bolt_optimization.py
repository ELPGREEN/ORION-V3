import sys

filepath = 'src/lib/voice/gcpSTT.ts'
content = open(filepath).read()

# Optimization: Pre-allocate Int16Array once per flush loop instead of element-by-element assignment if possible
# But float32ToLinear16Base64 is already pretty tight.
# Let's look for a better one.

# Ah! In float32ToLinear16Base64, the array length is known.
# Using a DataView or direct Int16 buffer manipulation might be faster, but JS engines are good at typed arrays.

# Wait, look at this:
# for (let i = 0; i < float32.length; i++) {
#   const s = Math.max(-1, Math.min(1, float32[i]));
#   int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
# }

# We can optimize the clipping and conversion logic slightly.
# Also, pre-calculate the 0x7fff and 0x8000 constants? They are already literals.

# What about the 'calculateRMS' function?
# It's usually a bottleneck in audio processing.

filepath = 'src/lib/voice/gcpSTT.ts'
