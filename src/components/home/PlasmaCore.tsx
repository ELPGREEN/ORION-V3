import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Interactive ORION Plasma Core — HD concentric rings + WebGL arcs
 * Enhanced with HUD arc segments, circuit traces, and multi-layered glow
 */

// ── WebGL electric arcs overlay ──

const ARC_VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const ARC_FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_hover;

#define PI 3.14159265
#define GOLD vec3(0.788, 0.659, 0.298)
#define CYAN vec3(0.231, 0.510, 0.918)

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float arc(vec2 uv, float angle, float width, float seed) {
  float c = cos(angle), s = sin(angle);
  vec2 dir = vec2(c, s);
  float proj = dot(uv, dir);
  if (proj < 0.05) return 0.0;
  vec2 perp = vec2(-s, c);
  float perpDist = dot(uv, perp);
  float noiseVal = noise(vec2(proj * 8.0 + seed, u_time * 3.0 + seed)) * 0.08;
  noiseVal += noise(vec2(proj * 20.0 + seed * 2.0, u_time * 5.0 + seed)) * 0.03;
  perpDist -= noiseVal;
  float fade = smoothstep(0.5, 0.08, proj);
  float intensity = exp(-abs(perpDist) / (width * (1.0 + u_hover * 0.5))) * fade;
  float flicker = 0.6 + 0.4 * sin(u_time * 14.0 + seed * 7.0);
  return intensity * flicker;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
  float dist = length(uv);
  vec3 col = vec3(0.0);

  // Electric arcs radiating from center
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float arcAngle = fi * PI * 2.0 / 10.0 + u_time * 0.25 + sin(u_time * 0.6 + fi) * 0.5;
    float seed = fi * 13.37;
    float visibility = smoothstep(0.2, 0.7, sin(u_time * 0.7 + fi * 2.1));
    float arcVal = arc(uv, arcAngle, 0.003, seed) * visibility;
    vec3 arcColor = mix(GOLD, CYAN, sin(fi * 0.7 + u_time * 0.4) * 0.5 + 0.5);
    col += arcColor * arcVal * (0.7 + u_hover * 0.5);

    // Secondary thinner arc
    float arcAngle2 = arcAngle + 0.12 + noise(vec2(u_time * 0.8 + fi, 0.0)) * 0.25;
    float arcVal2 = arc(uv, arcAngle2, 0.0015, seed + 50.0) * visibility * 0.4;
    col += CYAN * arcVal2 * 0.3;
  }

  // Subtle energy haze between rings
  float haze = noise(vec2(dist * 15.0, u_time * 1.5)) * 0.15;
  haze *= smoothstep(0.45, 0.2, dist) * smoothstep(0.0, 0.08, dist);
  col += GOLD * haze;

  // Circular vignette
  float vignette = smoothstep(0.48, 0.2, dist);
  col *= vignette;
  float alpha = vignette * clamp(length(col) * 2.5, 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

function initArcGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, ARC_VERT);
  const fs = compile(gl.FRAGMENT_SHADER, ARC_FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_position");
  gl.useProgram(prog); gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  return { gl, uTime: gl.getUniformLocation(prog, "u_time"), uRes: gl.getUniformLocation(prog, "u_resolution"), uHover: gl.getUniformLocation(prog, "u_hover") };
}

// ── HUD arc segments SVG overlay ──
function HudArcSegments({ hover, time }: { hover: boolean; time: number }) {
  const segments = [
    { r: 46, start: 15, end: 75, color: "hsl(var(--primary))", width: 2, speed: 0.3 },
    { r: 46, start: 200, end: 250, color: "hsl(var(--primary))", width: 1.5, speed: 0.3 },
    { r: 40, start: 60, end: 140, color: "hsl(var(--secondary))", width: 1.5, speed: -0.2 },
    { r: 40, start: 260, end: 310, color: "hsl(var(--secondary))", width: 1, speed: -0.2 },
    { r: 34, start: 0, end: 50, color: "hsl(var(--primary) / 0.6)", width: 1.5, speed: 0.15 },
    { r: 34, start: 130, end: 200, color: "hsl(var(--primary) / 0.6)", width: 1, speed: 0.15 },
    { r: 34, start: 280, end: 340, color: "hsl(var(--secondary) / 0.5)", width: 1, speed: 0.15 },
  ];

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ zIndex: 1 }}>
      {segments.map((seg, i) => {
        const rotation = (time * seg.speed * 30) % 360;
        const r = seg.r;
        const startAngle = (seg.start * Math.PI) / 180;
        const endAngle = (seg.end * Math.PI) / 180;
        const x1 = 50 + r * Math.cos(startAngle);
        const y1 = 50 + r * Math.sin(startAngle);
        const x2 = 50 + r * Math.cos(endAngle);
        const y2 = 50 + r * Math.sin(endAngle);
        const largeArc = seg.end - seg.start > 180 ? 1 : 0;

        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={seg.color}
            strokeWidth={seg.width}
            opacity={hover ? 0.7 : 0.35}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "50px 50px",
              transition: "opacity 0.5s ease",
              filter: hover ? `drop-shadow(0 0 3px ${seg.color})` : "none",
            }}
          />
        );
      })}

      {/* Circuit trace lines radiating out */}
      {[0, 45, 120, 200, 270, 330].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const rotation = (time * 0.1 * 30) % 360;
        const adjRad = ((angle + rotation) * Math.PI) / 180;
        const innerR = 24;
        const outerR = 48;
        const x1 = 50 + Math.cos(adjRad) * innerR;
        const y1 = 50 + Math.sin(adjRad) * innerR;
        const x2 = 50 + Math.cos(adjRad) * outerR;
        const y2 = 50 + Math.sin(adjRad) * outerR;

        return (
          <line
            key={`trace-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={i % 2 === 0 ? "hsl(var(--primary) / 0.2)" : "hsl(var(--secondary) / 0.15)"}
            strokeWidth={0.5}
            strokeDasharray="2 3"
          />
        );
      })}

      {/* Data node dots on outer ring */}
      {[30, 90, 150, 210, 270, 330].map((angle, i) => {
        const rotation = (time * 0.08 * 30) % 360;
        const adjRad = ((angle + rotation) * Math.PI) / 180;
        const r = 44;
        const cx = 50 + Math.cos(adjRad) * r;
        const cy = 50 + Math.sin(adjRad) * r;
        const pulse = 0.4 + Math.sin(time * 3 + i * 1.2) * 0.3;

        return (
          <circle
            key={`node-${i}`}
            cx={cx} cy={cy} r={1.2}
            fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
            opacity={pulse}
          />
        );
      })}
    </svg>
  );
}

// ── Component ──

export function PlasmaCore({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(0);
  const rafRef = useRef<number>(0);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) / (r.width / 2);
    const dy = (e.clientY - cy) / (r.height / 2);
    setMouse({ x: dx, y: dy });
  }, []);

  // SVG time driver
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const tick = () => {
      setTime((performance.now() - t0) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // WebGL arc overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = initArcGL(canvas);
    if (!ctx) return;
    const { gl, uTime, uRes, uHover } = ctx;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const t0 = performance.now();
    const loop = () => {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uHover, hover ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [hover]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none cursor-pointer ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMouse({ x: 0, y: 0 }); }}
      onMouseMove={handleMove}
      style={{ perspective: "600px" }}
    >
      {/* Outer ambient glow — enhanced with dual-color */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary) / ${hover ? 0.3 : 0.15}) 0%, hsl(var(--secondary) / ${hover ? 0.12 : 0.06}) 40%, transparent 70%)`,
          filter: `blur(${hover ? 45 : 30}px)`,
          transform: `scale(${hover ? 1.4 : 1.15})`,
        }}
      />

      {/* Secondary outer pulse ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset: "-8%",
          border: `1px solid hsl(var(--secondary) / ${hover ? 0.15 : 0.06})`,
          animation: "plasmaRingSpin 20s linear infinite",
          filter: hover ? "drop-shadow(0 0 6px hsl(var(--secondary) / 0.2))" : "none",
          transition: "filter 0.5s, border-color 0.5s",
        }}
      />

      {/* 3D tilt wrapper */}
      <div
        className="relative w-full h-full transition-transform duration-200 ease-out"
        style={{
          transform: `rotateY(${mouse.x * 15}deg) rotateX(${-mouse.y * 15}deg)`,
        }}
      >
        {/* HUD arc segments SVG */}
        <HudArcSegments hover={hover} time={time} />

        {/* Ring layers — each ring is a CSS border circle with animation */}
        {[
          { size: "100%", border: 3, delay: "0s", dur: "8s", opacity: 0.9 },
          { size: "82%", border: 2, delay: "0.3s", dur: "6s", opacity: 0.7 },
          { size: "64%", border: 4, delay: "0.6s", dur: "10s", opacity: 0.85 },
          { size: "48%", border: 2, delay: "0.9s", dur: "5s", opacity: 0.6 },
          { size: "34%", border: 3, delay: "1.2s", dur: "7s", opacity: 0.8 },
          { size: "22%", border: 2, delay: "0.5s", dur: "4s", opacity: 0.5 },
        ].map((ring, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 rounded-full"
            style={{
              width: ring.size,
              height: ring.size,
              transform: "translate(-50%, -50%)",
              border: `${ring.border}px solid hsl(var(--primary) / ${ring.opacity})`,
              boxShadow: `
                0 0 ${hover ? 20 : 10}px hsl(var(--primary) / ${ring.opacity * 0.5}),
                inset 0 0 ${hover ? 15 : 8}px hsl(var(--primary) / ${ring.opacity * 0.3})
              `,
              animation: `plasmaRingSpin${i % 2 === 0 ? "" : "Reverse"} ${ring.dur} linear infinite`,
              animationDelay: ring.delay,
              transition: "box-shadow 0.5s ease",
            }}
          />
        ))}

        {/* Radial tick marks on outer ring */}
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={`tick-${i}`}
            className="absolute top-1/2 left-1/2"
            style={{
              width: "1px",
              height: i % 3 === 0 ? "8%" : "4%",
              background: `linear-gradient(to bottom, hsl(var(--primary) / ${i % 3 === 0 ? 0.6 : 0.3}), transparent)`,
              transformOrigin: "center 0",
              transform: `translate(-50%, 0) rotate(${i * 15}deg) translateY(-48%)`,
              animation: `plasmaRingSpin 12s linear infinite`,
            }}
          />
        ))}

        {/* WebGL electric arcs overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-full"
          style={{ pointerEvents: "none", zIndex: 2 }}
        />

        {/* Inner bright core — enhanced with layered glow */}
        <div
          className="absolute top-1/2 left-1/2 rounded-full transition-all duration-500"
          style={{
            width: "14%",
            height: "14%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, hsl(0 0% 100% / ${hover ? 0.95 : 0.85}), hsl(var(--primary) / 0.9) 60%, transparent 100%)`,
            boxShadow: `
              0 0 ${hover ? 40 : 20}px hsl(var(--primary) / 0.8),
              0 0 ${hover ? 80 : 40}px hsl(var(--primary) / 0.4),
              0 0 ${hover ? 120 : 60}px hsl(var(--primary) / 0.2),
              0 0 ${hover ? 160 : 80}px hsl(var(--secondary) / 0.1)
            `,
            animation: "plasmaPulse 3s ease-in-out infinite",
            zIndex: 3,
          }}
        />

        {/* Mid glow ring */}
        <div
          className="absolute top-1/2 left-1/2 rounded-full transition-all duration-500"
          style={{
            width: "30%",
            height: "30%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, hsl(var(--primary) / ${hover ? 0.3 : 0.15}) 0%, transparent 70%)`,
            animation: "plasmaPulse 4s ease-in-out infinite reverse",
          }}
        />

        {/* Secondary mid glow — cyan accent */}
        <div
          className="absolute top-1/2 left-1/2 rounded-full transition-all duration-700"
          style={{
            width: "55%",
            height: "55%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, hsl(var(--secondary) / ${hover ? 0.08 : 0.03}) 0%, transparent 60%)`,
            animation: "plasmaPulse 5s ease-in-out infinite",
          }}
        />
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes plasmaRingSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes plasmaRingSpinReverse {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to   { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes plasmaPulse {
          0%, 100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 1;    transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}
