import { useRef, useEffect } from "react";

const VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

#define GOLD vec3(0.788, 0.659, 0.298)
#define GOLD_LIGHT vec3(0.85, 0.75, 0.45)
#define CYAN vec3(0.231, 0.510, 0.918)
#define DARK vec3(0.039, 0.039, 0.059)
#define ACCENT vec3(0.9, 0.55, 0.2)

#define PI 3.14159265359
#define TAU 6.28318530718

// Noise helpers
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
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 centered = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
  
  float t = u_time * 0.4;
  float r = length(centered);
  float angle = atan(centered.y, centered.x);
  
  vec3 col = DARK;
  
  // === PORTAL RING STRUCTURE ===
  // Multiple concentric rings with varying thickness
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ringRadius = 0.25 + fi * 0.08;
    float ringWidth = 0.012 - fi * 0.002;
    
    // Distort ring with noise for organic feel
    float distort = fbm(vec2(angle * 2.0 + t * (0.5 + fi * 0.2), fi * 3.0)) * 0.04;
    float ringDist = abs(r - ringRadius - distort) - ringWidth;
    
    // Spiral rotation per ring
    float spiralAngle = angle + t * (1.0 + fi * 0.3) * (mod(fi, 2.0) > 0.5 ? -1.0 : 1.0);
    float spiralPattern = sin(spiralAngle * (6.0 + fi * 2.0)) * 0.5 + 0.5;
    
    float ringGlow = exp(-ringDist * ringDist / 0.0001) * 0.8;
    float outerGlow = exp(-ringDist * ringDist / 0.001) * 0.3;
    
    vec3 ringColor = mix(GOLD, CYAN, fi / 4.0);
    col += ringColor * ringGlow * spiralPattern;
    col += ringColor * outerGlow * 0.5;
  }
  
  // === ENERGY RAYS (sparks radiating outward) ===
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float rayAngle = fi * TAU / 12.0 + t * 0.3;
    float rayDir = angle - rayAngle;
    rayDir = mod(rayDir + PI, TAU) - PI; // wrap
    
    float rayWidth = 0.02 + sin(t * 2.0 + fi * 1.5) * 0.01;
    float ray = exp(-rayDir * rayDir / (rayWidth * rayWidth * 0.01));
    
    // Fade ray based on distance from center
    float rayFade = smoothstep(0.15, 0.2, r) * smoothstep(0.6, 0.3, r);
    float pulse = 0.5 + 0.5 * sin(t * 3.0 + fi * 2.1);
    
    col += GOLD_LIGHT * ray * rayFade * pulse * 0.4;
  }
  
  // === INNER PORTAL GLOW ===
  float innerGlow = exp(-r * r / 0.015) * 0.6;
  float innerPulse = 0.7 + 0.3 * sin(t * 1.5);
  col += mix(GOLD, GOLD_LIGHT, innerPulse) * innerGlow * innerPulse;
  
  // === SPINNING RUNES / DASHES on rings ===
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    float runeAngle = fi * TAU / 24.0 + t * 0.8;
    float runeR = 0.28 + sin(fi * 1.3 + t) * 0.02;
    
    vec2 runePos = vec2(cos(runeAngle), sin(runeAngle)) * runeR;
    float d = length(centered - runePos);
    
    float brightness = 0.5 + 0.5 * sin(t * 2.0 + fi * 0.8);
    col += GOLD * exp(-d * d / 0.00008) * brightness * 0.5;
  }
  
  // === OUTER ENERGY FIELD ===
  float outerField = smoothstep(0.5, 0.35, r) * smoothstep(0.15, 0.25, r);
  float fieldNoise = fbm(vec2(angle * 3.0 + t * 0.5, r * 10.0 - t * 2.0));
  col += CYAN * outerField * fieldNoise * 0.15;
  
  // === FLOATING SPARKS ===
  for (int i = 0; i < 15; i++) {
    float fi = float(i);
    float sparkAngle = hash(vec2(fi, 0.0)) * TAU + t * (0.2 + hash(vec2(fi, 1.0)) * 0.5);
    float sparkR = 0.2 + hash(vec2(fi, 2.0)) * 0.25;
    sparkR += sin(t * 1.5 + fi * 2.0) * 0.03;
    
    vec2 sparkPos = vec2(cos(sparkAngle), sin(sparkAngle)) * sparkR;
    float d = length(centered - sparkPos);
    
    float twinkle = pow(0.5 + 0.5 * sin(t * (3.0 + fi * 0.5) + fi * 7.0), 3.0);
    col += ACCENT * exp(-d * d / 0.00015) * twinkle * 0.6;
  }
  
  // === SPIRAL ARMS (Doctor Strange style) ===
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float spiralOffset = fi * TAU / 3.0;
    float spiralAngle = angle - spiralOffset + r * 8.0 - t * 1.5;
    float spiral = pow(0.5 + 0.5 * sin(spiralAngle), 8.0);
    
    float spiralFade = smoothstep(0.5, 0.2, r) * smoothstep(0.1, 0.2, r);
    col += GOLD * spiral * spiralFade * 0.25;
    col += CYAN * spiral * spiralFade * 0.08;
  }
  
  // === RADIAL VIGNETTE ===
  float vig = 1.0 - smoothstep(0.3, 0.7, r);
  col *= mix(0.3, 1.0, vig);
  
  // === SUBTLE GRAIN ===
  float grain = hash(gl_FragCoord.xy + u_time) * 0.02;
  col += grain;
  
  // Overall fade at edges
  col *= smoothstep(0.8, 0.4, r);
  
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
      console.warn("Shader compile error:", gl.getShaderInfoLog(s));
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
    uMouse: gl.getUniformLocation(prog, "u_mouse"),
  };
}

interface GatewayBackgroundProps {
  className?: string;
  opacity?: number;
}

export function GatewayBackground({ className = "", opacity = 0.5 }: GatewayBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = initGL(canvas);
    if (!ctx) return;
    const { gl, uTime, uRes, uMouse } = ctx;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.0);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener("mousemove", handleMouse);

    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <div className={`absolute inset-0 ${className}`} style={{ pointerEvents: "none", opacity }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
}
