import { useRef, useEffect } from "react";

const VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;

#define GOLD vec3(0.788, 0.659, 0.298)
#define CYAN vec3(0.231, 0.510, 0.918)
#define DARK vec3(0.035, 0.035, 0.055)
#define VIOLET vec3(0.35, 0.15, 0.55)

// Improved noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 centered = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y;
  float t = u_time;
  
  vec3 col = DARK;
  
  // === VOLUMETRIC NEBULA ===
  vec2 nebUV = centered * 2.5;
  float neb1 = fbm(nebUV + vec2(t * 0.04, t * 0.02));
  float neb2 = fbm(nebUV * 1.5 + vec2(-t * 0.03, t * 0.05) + 5.0);
  float neb3 = fbm(nebUV * 0.8 + vec2(t * 0.02, -t * 0.03) + 10.0);
  
  col += GOLD * neb1 * 0.08 * smoothstep(0.3, 0.7, neb1);
  col += CYAN * neb2 * 0.05 * smoothstep(0.4, 0.8, neb2);
  col += VIOLET * neb3 * 0.04 * smoothstep(0.4, 0.75, neb3);
  
  // === PERSPECTIVE GRID (TRON) ===
  float horizon = 0.15;
  if (uv.y < horizon + 0.5) {
    vec2 gridUV = centered;
    float depth = 1.0 / max(horizon + 0.5 - uv.y, 0.001);
    float x = gridUV.x * depth * 0.5;
    float z = depth * 2.0 - t * 0.4;
    
    float gridX = abs(fract(x) - 0.5) * 2.0;
    float gridZ = abs(fract(z * 0.5) - 0.5) * 2.0;
    
    float lineX = smoothstep(0.015, 0.0, 1.0 - gridX) * 0.5;
    float lineZ = smoothstep(0.015, 0.0, 1.0 - gridZ) * 0.4;
    
    float gridFade = smoothstep(0.8, 0.3, uv.y) * smoothstep(0.0, 0.12, uv.y);
    float perspFade = exp(-depth * 0.04);
    
    // Glow around grid lines
    float glowX = smoothstep(0.1, 0.0, 1.0 - gridX) * 0.15;
    float glowZ = smoothstep(0.1, 0.0, 1.0 - gridZ) * 0.12;
    
    col += GOLD * (lineX + lineZ + glowX + glowZ) * gridFade * perspFade * 0.6;
    col += CYAN * (lineX * lineZ) * gridFade * perspFade * 0.2;
  }
  
  // === TOP GRID (subtle) ===
  if (uv.y > 0.55) {
    float topFade = smoothstep(0.55, 0.9, uv.y) * 0.12;
    float gx = abs(fract(centered.x * 8.0 + t * 0.02) - 0.5) * 2.0;
    float gy = abs(fract(centered.y * 8.0 - t * 0.01) - 0.5) * 2.0;
    float topGrid = smoothstep(0.02, 0.0, 1.0 - gx) + smoothstep(0.02, 0.0, 1.0 - gy);
    col += GOLD * topGrid * topFade * 0.06;
  }
  
  // === PARTICLE FIELD with trails ===
  for (int i = 0; i < 30; i++) {
    float fi = float(i);
    float seed1 = hash(vec2(fi, 0.0));
    float seed2 = hash(vec2(0.0, fi));
    float speed = 0.15 + seed1 * 0.25;
    
    vec2 pPos = vec2(
      seed1 * 2.0 - 1.0 + sin(t * speed + fi * 1.7) * 0.12,
      seed2 * 2.0 - 1.0 + cos(t * speed * 0.7 + fi * 2.3) * 0.1
    );
    
    float d = length(centered - pPos);
    float brightness = seed2 * 0.6 + 0.4;
    float twinkle = 0.6 + 0.4 * sin(t * (0.8 + fi * 0.2) + fi * 3.14);
    float size = 0.0002 + seed1 * 0.0003;
    
    // Core
    float particle = exp(-d * d / size) * brightness * twinkle;
    // Glow halo
    float halo = exp(-d * d / (size * 8.0)) * brightness * twinkle * 0.15;
    
    vec3 pColor = mix(GOLD, CYAN, seed1);
    col += pColor * (particle * 0.35 + halo);
  }
  
  // === ENERGY STREAMS ===
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float streamY = sin(centered.x * 3.0 + t * 0.5 + fi * 2.094) * 0.3 + fi * 0.2 - 0.2;
    float streamDist = abs(centered.y - streamY);
    float stream = exp(-streamDist * streamDist / 0.0008) * 0.06;
    float streamFlow = sin(centered.x * 20.0 - t * 3.0 + fi * 5.0) * 0.5 + 0.5;
    col += mix(GOLD, CYAN, fi / 2.0) * stream * streamFlow;
  }
  
  // === HORIZONTAL SCAN LINE ===
  float scanY = fract(t * 0.06);
  float scanLine = exp(-pow(uv.y - scanY, 2.0) / 0.00015) * 0.08;
  col += mix(GOLD, CYAN, 0.3) * scanLine;
  
  // === CHROMATIC ABERRATION (subtle) ===
  vec2 caOffset = centered * 0.003;
  float ca_r = fbm((centered + caOffset) * 3.0 + t * 0.05);
  float ca_b = fbm((centered - caOffset) * 3.0 + t * 0.05);
  col.r += ca_r * 0.01;
  col.b += ca_b * 0.01;
  
  // === BLOOM (fake) ===
  float bloomMask = smoothstep(0.12, 0.0, length(centered)) * 0.06;
  col += GOLD * bloomMask;
  
  // === RADIAL VIGNETTE ===
  float vig = 1.0 - length(centered) * 0.75;
  vig = smoothstep(0.0, 1.0, vig);
  col *= vig;
  
  // === FILM GRAIN ===
  float grain = (hash(gl_FragCoord.xy + t * 100.0) - 0.5) * 0.025;
  col += grain;
  
  // Clamp
  col = max(col, 0.0);
  
  gl_FragColor = vec4(col, 1.0);
}
`;

function initGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: false });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, "a_position");
  gl.useProgram(prog);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  return {
    gl,
    uTime: gl.getUniformLocation(prog, "u_time"),
    uRes: gl.getUniformLocation(prog, "u_resolution"),
  };
}

export function HeroThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = initGL(canvas);
    if (!ctx) return;
    const { gl, uTime, uRes } = ctx;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
      <div className="absolute inset-0 bg-background/30" />
    </div>
  );
}
