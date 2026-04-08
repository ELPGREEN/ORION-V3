/**
 * NEUROCORE AI — Energy Orb WebGL Shader Component
 * Extracted from NeuralVision.tsx for modularity
 */
import { useRef, useEffect } from "react";

// ═══ Global shared VFX state ═══
export const OrbState = {
  aiResponding: false,
  active: false,
  awareness: 50, // starts at 50, converges to real IIT Phi (~70-85%) within seconds
  regions: [] as any[],
  motion: { intensity: 0 } as { intensity: number },
};

const plasmaVertSrc = `
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const plasmaFragSrc = `
  precision highp float;
  varying vec2 vUv;
  uniform float iTime;
  uniform vec2 iResolution;
  uniform float uReactivity;
  uniform float uMode;
  uniform float uTransition;

  #define PI 3.14159265
  #define TAU 6.28318530

  float hash(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 157.0 + 113.0 * i.z;
    return mix(
      mix(mix(hash(n), hash(n+1.0), f.x),
          mix(hash(n+157.0), hash(n+158.0), f.x), f.y),
      mix(mix(hash(n+113.0), hash(n+114.0), f.x),
          mix(hash(n+270.0), hash(n+271.0), f.x), f.y), f.z);
  }

  float fbm(vec3 p, int oct) {
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 6; i++) {
      if(i >= oct) break;
      v += a * noise(p);
      p = p * 2.03 + vec3(0.31, 0.17, 0.09);
      a *= 0.49;
    }
    return v;
  }

  vec3 getC1(float m) {
    if(m < 1.0) return vec3(0.05, 0.55, 1.0);
    if(m < 2.0) return vec3(1.0, 0.5, 0.02);
    if(m < 3.0) return vec3(0.6, 0.05, 1.0);
    if(m < 4.0) return vec3(0.05, 1.0, 0.4);
    if(m < 5.0) return vec3(1.0, 0.08, 0.4);
    if(m < 6.0) return vec3(1.0, 0.78, 0.08);
    if(m < 7.0) return vec3(1.0, 0.18, 0.0);
    return vec3(0.15, 0.4, 1.0);
  }
  vec3 getC2(float m) {
    if(m < 1.0) return vec3(0.35, 0.85, 1.0);
    if(m < 2.0) return vec3(1.0, 0.78, 0.25);
    if(m < 3.0) return vec3(0.88, 0.3, 1.0);
    if(m < 4.0) return vec3(0.35, 1.0, 0.7);
    if(m < 5.0) return vec3(1.0, 0.42, 0.65);
    if(m < 6.0) return vec3(1.0, 0.95, 0.4);
    if(m < 7.0) return vec3(1.0, 0.48, 0.15);
    return vec3(0.4, 0.65, 1.0);
  }
  vec3 getC3(float m) {
    if(m < 1.0) return vec3(0.65, 0.95, 1.0);
    if(m < 2.0) return vec3(1.0, 0.92, 0.65);
    if(m < 3.0) return vec3(0.92, 0.65, 1.0);
    if(m < 4.0) return vec3(0.65, 1.0, 0.82);
    if(m < 5.0) return vec3(1.0, 0.72, 0.82);
    if(m < 6.0) return vec3(1.0, 1.0, 0.75);
    if(m < 7.0) return vec3(1.0, 0.75, 0.55);
    return vec3(0.75, 0.85, 1.0);
  }

  float thickRing(vec2 uv, float radius, float thickness, float glowSize) {
    float r = length(uv);
    float inner = radius - thickness * 0.5;
    float outer = radius + thickness * 0.5;
    float band = smoothstep(inner - 0.003, inner + 0.003, r) * smoothstep(outer + 0.003, outer - 0.003, r);
    float edgeIn = exp(-pow(abs(r - inner), 2.0) / 0.00003);
    float edgeOut = exp(-pow(abs(r - outer), 2.0) / 0.00003);
    float d = abs(r - radius);
    float glow = exp(-d * d / (glowSize * glowSize));
    float wideBloom = exp(-d * d / (glowSize * glowSize * 6.0)) * 0.25;
    return band * 0.8 + (edgeIn + edgeOut) * 0.6 + glow * 0.45 + wideBloom;
  }

  float ringEnergy(vec2 uv, float radius, float thickness, float t, float react) {
    float r = length(uv);
    float inner = radius - thickness * 0.5;
    float outer = radius + thickness * 0.5;
    float inBand = smoothstep(inner, inner + 0.005, r) * smoothstep(outer, outer - 0.005, r);
    if(inBand < 0.01) return 0.0;
    float angle = atan(uv.y, uv.x);
    float bandPos = (r - inner) / thickness;
    vec3 np = vec3(angle * 3.0 + t * (2.0 + react * 4.0), bandPos * 3.0, t * 0.4);
    float tex = fbm(np, 5);
    float streak1 = pow(max(0.0, sin(angle * 8.0 + t * (5.0 + react * 8.0))), 4.0);
    float streak2 = pow(max(0.0, sin(angle * 13.0 - t * 3.5 + bandPos * 4.0)), 5.0);
    return inBand * (0.3 + tex * 0.5 + streak1 * 0.25 + streak2 * 0.15) * (1.0 + react * 1.5);
  }

  float arcSeg(vec2 uv, float radius, float thick, float startA, float span) {
    float r = length(uv);
    float angle = atan(uv.y, uv.x);
    float diff = mod(angle - startA + PI, TAU) - PI;
    float inArc = smoothstep(-0.02, 0.02, diff) * smoothstep(span + 0.02, span - 0.02, diff);
    float d = abs(r - radius);
    float core = smoothstep(thick, thick * 0.1, d) * inArc;
    float glow2 = exp(-d * d / (thick * thick * 8.0)) * inArc * 0.3;
    return core + glow2;
  }

  float gaugeTicks(vec2 uv, float radius, float count, float len, float w) {
    float r = length(uv);
    float angle = atan(uv.y, uv.x);
    float tickA = mod(angle + PI, TAU / count) - (TAU / count) * 0.5;
    float thresh = w / radius;
    return smoothstep(thresh, thresh * 0.3, abs(tickA))
         * smoothstep(-0.001, 0.003, r - radius)
         * smoothstep(len + 0.002, len - 0.003, r - radius);
  }

  float radialLines(vec2 uv, float count, float lineW, float innerR, float outerR, float rotation) {
    float r = length(uv);
    if(r < innerR || r > outerR) return 0.0;
    float angle = atan(uv.y, uv.x) + rotation;
    float sector = mod(angle + PI, TAU / count) - (TAU / count) * 0.5;
    float thresh = lineW / r;
    float line = exp(-sector * sector / (thresh * thresh));
    float fade = smoothstep(innerR, innerR + 0.02, r) * smoothstep(outerR, outerR - 0.02, r);
    return line * fade;
  }

  float hexGrid(vec2 uv, float scale) {
    vec2 p = uv * scale;
    vec2 h = vec2(1.0, 1.732);
    vec2 a = mod(p, h) - h * 0.5;
    vec2 b = mod(p + h * 0.5, h) - h * 0.5;
    float da = max(abs(a.x), abs(a.y * 0.577 + a.x * 0.5));
    float db = max(abs(b.x), abs(b.y * 0.577 + b.x * 0.5));
    float d = min(da, db);
    return smoothstep(0.48, 0.46, d) - smoothstep(0.46, 0.42, d);
  }

  float bolt(vec2 uv, float angle, float maxR, float t, float seed, float react) {
    vec2 dir = vec2(cos(angle), sin(angle));
    float along = dot(uv, dir);
    if(along < 0.0 || along > maxR) return 0.0;
    vec2 perp = uv - dir * along;
    float z = (noise(vec3(along * 16.0, seed * 17.0, t * (6.0 + react * 8.0))) - 0.5) * 0.06;
    z += (noise(vec3(along * 32.0, seed * 31.0, t * 10.0)) - 0.5) * 0.025;
    z += (noise(vec3(along * 64.0, seed * 43.0, t * 15.0)) - 0.5) * 0.01;
    perp.x += z;
    perp.y += (noise(vec3(along * 18.0, seed * 23.0, t * 5.0)) - 0.5) * 0.04;
    float d = length(perp);
    float w = 0.0012 + along * 0.0006;
    float core = exp(-d * d / (w * w));
    float glow2 = exp(-d * d / (w * w * 14.0)) * 0.35;
    float fade = smoothstep(maxR, maxR * 0.1, along);
    float flicker = 0.15 + 0.85 * step(0.1, hash(floor(t * (22.0 + react * 40.0)) + seed * 47.0));
    return (core + glow2) * fade * flicker;
  }

  float orbitParticles(vec2 uv, float t, float react, float count, float radius) {
    float v = 0.0;
    for(float i = 0.0; i < 20.0; i++) {
      if(i >= count) break;
      float speed = 0.6 + hash(i * 3.14) * 1.2 + react * 1.5;
      float a = hash(i * 7.13) * TAU + t * speed;
      float rad = radius + sin(t * 1.5 + i * 0.7) * 0.015;
      for(float j = 0.0; j < 4.0; j++) {
        float trailA = a - j * 0.035 * speed;
        vec2 tp = vec2(cos(trailA), sin(trailA)) * rad;
        float d = length(uv - tp);
        float sz = 0.003 - j * 0.0004;
        v += exp(-d * d / (sz * sz)) * (1.0 - j * 0.22) * 0.5;
      }
    }
    return v;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    float t = iTime;
    float react = uReactivity;
    float mode = uMode;

    vec3 c1 = getC1(mode);
    vec3 c2 = getC2(mode);
    vec3 c3 = getC3(mode);
    float r = length(uv);
    vec3 col = vec3(0.0);

    float hg = hexGrid(uv, 8.0);
    col += c1 * hg * 0.035;

    float darkCore = smoothstep(0.09, 0.02, r);
    float coreRim = exp(-pow(r - 0.06, 2.0) / 0.0006) * (2.5 + react * 3.5);
    float corePulse = 1.0 + 0.3 * sin(t * (3.0 + react * 10.0)) + 0.1 * sin(t * 7.3);
    col += c3 * coreRim * corePulse;
    col += c3 * exp(-r * r / (0.0004 * corePulse)) * (1.8 + react * 3.0);

    float angle = atan(uv.y, uv.x);
    float spiral = 0.0;
    for(float i = 0.0; i < 4.0; i++) {
      float armA = angle + t * (1.2 + react * 3.0) + i * TAU / 4.0;
      float armV = sin(armA * 1.0 + r * 14.0) * 0.5 + 0.5;
      armV = pow(armV, 3.0);
      armV *= smoothstep(0.38, 0.06, r) * smoothstep(0.03, 0.08, r);
      spiral += armV;
    }
    float turbNoise = fbm(vec3(uv * 5.0, t * 0.3), 4);
    spiral *= 0.4 + turbNoise * 0.6;
    col += mix(c1, c2, 0.4) * spiral * (0.35 + react * 0.8);

    col += c1 * thickRing(uv, 0.15, 0.016, 0.010) * 2.0;
    col += c1 * ringEnergy(uv, 0.15, 0.016, t, react) * 1.5;
    col += c2 * thickRing(uv, 0.25, 0.035, 0.018) * 2.8;
    col += mix(c1, c2, 0.3) * ringEnergy(uv, 0.25, 0.035, t * 0.9, react) * 2.2;
    col += c1 * thickRing(uv, 0.38, 0.05, 0.025) * 3.2;
    col += mix(c1, c2, 0.5) * ringEnergy(uv, 0.38, 0.05, t * 0.75, react) * 2.8;
    col += c2 * thickRing(uv, 0.50, 0.04, 0.022) * 3.0;
    col += mix(c1, c2, 0.7) * ringEnergy(uv, 0.50, 0.04, t * 0.6, react) * 2.5;
    col += c1 * thickRing(uv, 0.60, 0.012, 0.012) * 1.6;

    col += c1 * radialLines(uv, 12.0, 0.003, 0.10, 0.38, t * 0.15) * 0.4;
    col += c2 * radialLines(uv, 8.0, 0.002, 0.30, 0.55, -t * 0.1) * 0.3;
    col += c1 * radialLines(uv, 16.0, 0.001, 0.45, 0.62, t * 0.08) * 0.2;

    float segs = 0.0;
    segs += arcSeg(uv, 0.18, 0.004, t * 1.3, 1.6) * 1.2;
    segs += arcSeg(uv, 0.18, 0.004, t * 1.3 + PI, 1.0) * 0.8;
    segs += arcSeg(uv, 0.18, 0.004, t * 1.3 + PI * 0.6, 0.5) * 0.6;
    segs += arcSeg(uv, 0.31, 0.005, -t * 0.9, 2.4) * 1.5;
    segs += arcSeg(uv, 0.31, 0.005, -t * 0.9 + PI * 1.2, 1.6) * 1.2;
    segs += arcSeg(uv, 0.31, 0.005, -t * 0.9 + PI * 0.4, 0.8) * 0.7;
    segs += arcSeg(uv, 0.44, 0.004, t * 0.6, 2.8) * 1.3;
    segs += arcSeg(uv, 0.44, 0.004, t * 0.6 + PI, 2.0) * 1.0;
    segs += arcSeg(uv, 0.44, 0.004, t * 0.6 + PI * 0.7, 0.6) * 0.5;
    segs += arcSeg(uv, 0.56, 0.003, -t * 0.4, 3.2) * 0.8;
    segs += arcSeg(uv, 0.56, 0.003, -t * 0.4 + PI * 1.5, 1.2) * 0.6;
    col += mix(c1, c2, 0.4) * segs * (0.9 + react * 0.7);

    col += c1 * gaugeTicks(uv, 0.50, 90.0, 0.014, 0.004) * 0.45;
    col += c2 * gaugeTicks(uv, 0.50, 12.0, 0.028, 0.008) * 1.1;
    col += c1 * gaugeTicks(uv, 0.38, 60.0, 0.012, 0.004) * 0.40;
    col += c2 * gaugeTicks(uv, 0.38, 8.0, 0.024, 0.007) * 0.9;
    col += c1 * gaugeTicks(uv, 0.25, 36.0, 0.009, 0.003) * 0.35;
    col += c2 * gaugeTicks(uv, 0.25, 6.0, 0.018, 0.006) * 0.7;
    col += c1 * gaugeTicks(uv, 0.15, 24.0, 0.007, 0.003) * 0.30;

    float arcs = 0.0;
    float arcCount = 2.0 + react * 4.0;
    for(float i = 0.0; i < 6.0; i++) {
      if(i >= arcCount) break;
      float a = (i / max(arcCount, 1.0)) * TAU + t * (0.6 + react * 2.5) + sin(t * 0.5 + i) * 0.4;
      arcs += bolt(uv, a, 0.42 + react * 0.12, t, i * 0.618, react);
    }
    col += c1 * arcs * (2.8 + react * 4.5);
    col += c3 * arcs * 0.5;

    col += c2 * orbitParticles(uv, t, react, 6.0 + react * 8.0, 0.25) * 1.1;
    col += c1 * orbitParticles(uv, t * 0.7, react, 5.0 + react * 6.0, 0.38) * 1.0;
    col += c2 * orbitParticles(uv, t * 0.5, react, 4.0 + react * 5.0, 0.50) * 0.8;

    if(react > 0.03) {
      float pulsePhase = t * (8.0 + react * 15.0);
      for(float i = 0.0; i < 3.0; i++) {
        float pr = 0.10 + fract(pulsePhase * 0.12 + i * 0.33) * 0.52;
        float pd = abs(r - pr);
        float pw = 0.0012 + react * 0.003;
        float wave = exp(-pd * pd / (pw * pw)) * react * (1.0 - i * 0.25);
        col += mix(c1, c2, i * 0.3) * wave * 1.8;
      }
    }

    // Outer atmospheric glow
    float outerG = exp(-(r - 0.55) * (r - 0.55) / (0.015 + react * 0.03)) * 0.5;
    outerG *= smoothstep(0.42, 0.60, r);
    col += c1 * outerG * (1.0 + react * 0.8);
    
    // Volumetric inner fill
    col += c1 * exp(-r * r * 1.2) * 0.08;
    
    // Secondary outer bloom ring
    float outerBloom = exp(-(r - 0.62) * (r - 0.62) / 0.008) * 0.2;
    col += mix(c1, c2, 0.5) * outerBloom;

    col *= (1.0 - darkCore * 0.75);

    // HDR tone mapping for richer colors
    col = col / (1.0 + col * 0.3);
    col = pow(min(col, 5.0), vec3(0.85));
    
    // Subtle film grain for realism
    float grain = (noise(vec3(gl_FragCoord.xy * 0.5, t * 2.0)) - 0.5) * 0.015;
    col += grain;
    
    // Rich dark background with subtle atmosphere
    vec3 bg = vec3(0.003, 0.004, 0.015);
    bg += c1 * exp(-r * r * 0.8) * 0.03;
    bg += c1 * hexGrid(uv, 12.0) * 0.02;
    
    // Vignette for cinematic depth
    float vignette = 1.0 - smoothstep(0.5, 0.85, r) * 0.3;
    
    gl_FragColor = vec4((bg + col) * vignette, 1.0);
  }
`;

export function PlasmaCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef(Date.now());
  const reactivityRef = useRef(0);
  const modeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, premultipliedAlpha: false });
    if (!gl) return;

    function compileShader(src: string, type: number) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error("Shader error:", gl!.getShaderInfoLog(s));
      }
      return s;
    }

    const vs = compileShader(plasmaVertSrc, gl.VERTEX_SHADER);
    const fs = compileShader(plasmaFragSrc, gl.FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "iTime");
    const resLoc = gl.getUniformLocation(program, "iResolution");
    const reactLoc = gl.getUniformLocation(program, "uReactivity");
    const modeLoc = gl.getUniformLocation(program, "uMode");
    const transLoc = gl.getUniformLocation(program, "uTransition");

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2.0);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // ═══ Consciousness Heartbeat: run IIT Phi engine every 4s ═══
    let consciousnessInterval: ReturnType<typeof setInterval> | null = null;
    (async () => {
      try {
        const { runConsciousnessBridge } = await import("@/lib/neural/consciousness-bridge");
        const runCycle = () => {
          try {
            runConsciousnessBridge({
              intent: "general",
              query: "sistema ativo — monitoramento contínuo",
              hasVision: OrbState.active,
              hasAudio: !!(window as any).__orion_mic_arbiter__?.rec,
              memoryFacts: [],
              activeModules: ["causal-reasoning", "theory-of-mind", "meta-learning"],
            });
          } catch {}
        };
        runCycle(); // immediate first run
        consciousnessInterval = setInterval(runCycle, 4000);
      } catch {}
    })();

    let lastResponding = false;
    let lastModeChange = Date.now();
    let lastAwareness = 0;

    function render() {
      if (!gl || !canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.005, 0.005, 0.015, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (Date.now() - startRef.current) / 1000;
      const now = Date.now();

      const target = OrbState.aiResponding ? 1.0 : 0.0;
      reactivityRef.current += (target - reactivityRef.current) * 0.08;

      if (OrbState.aiResponding && !lastResponding) {
        modeRef.current = (modeRef.current + 1) % 8;
        lastModeChange = now;
      }
      lastResponding = OrbState.aiResponding;

      if (!OrbState.aiResponding && now - lastModeChange > 30000) {
        modeRef.current = (modeRef.current + 1) % 8;
        lastModeChange = now;
      }

      const awarenessNow = OrbState.awareness;
      if (Math.abs(awarenessNow - lastAwareness) > 25 && now - lastModeChange > 5000) {
        modeRef.current = (modeRef.current + 1) % 8;
        lastModeChange = now;
      }
      lastAwareness = awarenessNow;

      if (OrbState.motion.intensity > 50 && now - lastModeChange > 8000) {
        modeRef.current = (modeRef.current + 1) % 8;
        lastModeChange = now;
      }

      // ═══ Real consciousness score: IIT Phi base + subsystem bonuses ═══
      // The consciousness engine (Global Workspace) runs independently and provides
      // the real phi/PLV values. We use those as the foundation (60-85% range),
      // then add bonuses for active subsystems (vision, mic, reasoning).
      const consciousnessState = (window as any).__orion_consciousness_snapshot__;
      const basePhi = consciousnessState?.phi ?? 0.5; // IIT Phi from consciousness engine
      const basePLV = consciousnessState?.globalPLV ?? 0.5;
      // Base: phi-weighted consciousness floor (50-85% when engine is running)
      const consciousnessBase = Math.round((basePhi * 0.6 + basePLV * 0.4) * 85);

      if (OrbState.active) {
        let bonus = 5; // camera active bonus
        bonus += OrbState.regions.length > 0 ? 5 : 0; // vision detecting regions
        bonus += OrbState.aiResponding ? 5 : 0; // reasoning pipeline active
        const micState = (window as any).__orion_mic_arbiter__;
        if (micState && micState.rec) bonus += 3; // mic has active owner
        if (micState && micState.mode === "command") bonus += 2; // STT active
        const rtv = (window as any).__orion_last_rt_vision_ts__;
        if (rtv && Date.now() - rtv < 5000) bonus += 5; // fresh frame within 5s
        OrbState.awareness = Math.min(100, consciousnessBase + bonus);
      } else {
        // Idle: consciousness engine still provides base awareness
        let idleBonus = 0;
        const micState = (window as any).__orion_mic_arbiter__;
        if (micState && micState.rec && micState.mode === "wake") idleBonus += 5;
        // Small oscillation for organic feel
        OrbState.awareness = Math.max(10, Math.min(100, consciousnessBase + idleBonus + Math.sin(t * 0.5) * 3));
      }

      gl.uniform1f(timeLoc, t);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(reactLoc, reactivityRef.current);
      gl.uniform1f(modeLoc, modeRef.current);
      gl.uniform1f(transLoc, 0.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (consciousnessInterval) clearInterval(consciousnessInterval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: "block", cursor: "default" }}
    />
  );
}
