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
#define CYAN vec3(0.0, 0.6, 0.8)
#define DARK vec3(0.039, 0.039, 0.059)

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 centered = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y;
  
  vec3 col = DARK;
  
  // === TRON GRID ===
  // Perspective grid floor
  float horizon = 0.15;
  if (uv.y < horizon + 0.5) {
    vec2 gridUV = centered;
    // Perspective transform
    float depth = 1.0 / max(horizon + 0.5 - uv.y, 0.001);
    float x = gridUV.x * depth * 0.5;
    float z = depth * 2.0 - u_time * 0.3;
    
    // Grid lines
    float gridX = abs(fract(x) - 0.5) * 2.0;
    float gridZ = abs(fract(z * 0.5) - 0.5) * 2.0;
    
    float lineX = smoothstep(0.02, 0.0, 1.0 - gridX) * 0.4;
    float lineZ = smoothstep(0.02, 0.0, 1.0 - gridZ) * 0.3;
    
    float gridFade = smoothstep(0.8, 0.3, uv.y) * smoothstep(0.0, 0.15, uv.y);
    float perspFade = exp(-depth * 0.05);
    
    col += GOLD * (lineX + lineZ) * gridFade * perspFade * 0.5;
    col += CYAN * (lineX * lineZ) * gridFade * perspFade * 0.3;
  }
  
  // === TOP GRID (subtle) ===
  if (uv.y > 0.5) {
    float topFade = smoothstep(0.5, 0.85, uv.y) * 0.15;
    float gx = abs(fract(centered.x * 8.0) - 0.5) * 2.0;
    float gy = abs(fract(centered.y * 8.0) - 0.5) * 2.0;
    float topGrid = smoothstep(0.02, 0.0, 1.0 - gx) + smoothstep(0.02, 0.0, 1.0 - gy);
    col += GOLD * topGrid * topFade * 0.08;
  }
  
  // === FLOATING PARTICLES ===
  for (int i = 0; i < 20; i++) {
    float fi = float(i);
    vec2 pPos = vec2(
      hash(vec2(fi, 0.0)) * 2.0 - 1.0,
      hash(vec2(0.0, fi)) * 2.0 - 1.0
    );
    pPos.y += sin(u_time * 0.3 + fi * 1.7) * 0.15;
    pPos.x += cos(u_time * 0.2 + fi * 2.3) * 0.1;
    
    float d = length(centered - pPos);
    float brightness = hash(vec2(fi, fi)) * 0.5 + 0.5;
    float twinkle = 0.5 + 0.5 * sin(u_time * (1.0 + fi * 0.3) + fi);
    
    col += GOLD * exp(-d * d / 0.0003) * brightness * twinkle * 0.3;
  }
  
  // === HORIZONTAL SCAN LINE ===
  float scanY = fract(u_time * 0.05);
  float scanLine = exp(-pow(uv.y - scanY, 2.0) / 0.0002) * 0.1;
  col += CYAN * scanLine;
  
  // === RADIAL VIGNETTE ===
  float vig = 1.0 - length(centered) * 0.8;
  col *= vig;
  
  // === SUBTLE NOISE GRAIN ===
  float grain = hash(gl_FragCoord.xy + u_time) * 0.03;
  col += grain;
  
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
      const dpr = Math.min(window.devicePixelRatio, 1.0); // limit for perf
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
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
}
