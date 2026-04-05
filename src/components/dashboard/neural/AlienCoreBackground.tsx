import { useRef, useEffect, useMemo } from "react";

/**
 * Alien Core v0.2 shader rendered as a 2D canvas background.
 * Uses pure WebGL — no Three.js dependency — so it can be placed
 * behind any DOM element as an absolute-positioned canvas.
 */

const vertSrc = `
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragSrc = `
  precision mediump float;
  uniform float iTime;
  uniform vec2 iResolution;
  uniform vec3 uColor;
  varying vec2 vUv;

  #define R(p, a) p = p * cos(a) + vec2(-p.y, p.x) * sin(a)
  #define tau 6.2831853

  float spiral(vec2 p, float scl) {
    float r = length(p);
    r = log(r);
    float a = atan(p.y, p.x);
    return abs(mod(scl * (r - 2.0 / scl * a), tau) - 1.0);
  }

  float Sin01(float t) {
    return 1.5 + 0.5 * sin(1.28319 * t);
  }

  float SineEggCarton(vec3 p) {
    return 0.5 + abs(sin(p.x) - cos(p.y) + sin(p.z)) * (1.0 * p.z) / (3.0 + spiral(p.xy, p.z));
  }

  float Map(vec3 p, float scale) {
    float dSphere = length(p) - 1.0;
    return max(dSphere, (0.9 - SineEggCarton(scale * p)) / scale);
  }

  vec3 GetColor(vec3 p) {
    float amount = clamp((1.5 - length(p)) / 2.0, 0.0, 1.0);
    vec3 col = 0.5 + 0.5 * cos(6.28319 * (vec3(0.08, 0.15, 0.35) + amount * 0.9 * vec3(1.0, 0.6, 0.8)));
    col *= uColor;
    return col * amount * cos(p.z) * 2.2;
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= iResolution.x / iResolution.y;
    p *= 0.5 + 0.1 - iTime * 0.00001;

    vec3 rd = normalize(vec3(2.0 * gl_FragCoord.xy - iResolution.xy, -iResolution.y));
    vec3 ro = vec3(cos(iTime * 0.1) * 0.1, 0.0, mix(1.0, cos(iTime * 0.1) * 0.1 + 1.6, -0.3 + Sin01(0.05 * iTime)));

    R(rd.xz, 0.2 * iTime);
    R(ro.xz, 0.2 * iTime);
    R(rd.yz, 0.05 * iTime);
    R(ro.yz, 0.05 * iTime);

    float t = 0.0;
    vec3 col = vec3(0.0);
    float scale = mix(0.05, 5.0, Sin01(0.068 * iTime * 0.2));

    for (int i = 0; i < 64; i++) {
      vec3 p = ro + t * rd;
      float d = Map(p, scale);
      if (t > 5.0 || d < 0.0001) {
        break;
      }
      t += 1.0 * d;
      col += 0.03 * GetColor(p) * 0.9;
    }

    // Soft vignette
    float dist = length(vUv - 0.5) * 2.0;
    float alpha = smoothstep(1.3, 0.0, dist) * 0.55;

    gl_FragColor = vec4(col * 0.9, alpha);
  }
`;

interface AlienCoreBackgroundProps {
  className?: string;
  colorR?: number;
  colorG?: number;
  colorB?: number;
}

export function AlienCoreBackground({
  className = "",
  colorR = 1.3,
  colorG = 0.45,
  colorB = 0.12,
}: AlienCoreBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    glRef.current = gl;

    // Compile shaders
    function compileShader(src: string, type: number) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      }
      return s;
    }

    const vs = compileShader(vertSrc, gl.VERTEX_SHADER);
    const fs = compileShader(fragSrc, gl.FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    programRef.current = program;
    gl.useProgram(program);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function render() {
      if (!gl || !programRef.current || !canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(programRef.current);

      const t = (Date.now() - startTimeRef.current) / 1000;
      gl.uniform1f(gl.getUniformLocation(programRef.current, "iTime"), t);
      gl.uniform2f(gl.getUniformLocation(programRef.current, "iResolution"), canvas.width, canvas.height);
      gl.uniform3f(gl.getUniformLocation(programRef.current, "uColor"), colorR, colorG, colorB);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [colorR, colorG, colorB]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
