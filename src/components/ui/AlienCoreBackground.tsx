// @ts-nocheck
import { useRef, useMemo, Component, ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

class ShaderErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: any) { console.warn("[AlienCoreBackground] error:", e); }
  render() { return this.state.hasError ? null : this.props.children; }
}

/* ─── Noise texture (procedural) ─── */
function createNoiseTexture(): THREE.DataTexture {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.random() * 255;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/* ─── Fragment shader: Alien Core ─── */
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float iGlobalTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;

#define R(p, a) p = p * cos(a) + vec2(-p.y, p.x) * sin(a)
#define time iGlobalTime * 0.1
#define tau 6.2831853

mat2 makem2(in float theta) {
  float c = cos(theta); float s = sin(theta);
  return mat2(c, -s, s, c);
}

float noise(in vec2 x) { return texture2D(iChannel0, x * .01).x; }

mat2 m2 = mat2(.80, 0.60, -0.80, 0.80);

float grid(vec2 p) {
  return sin(p.x) * cos(p.y);
}

float flow(in vec2 p) {
  float z = 4.0;
  float rz = 0.0;
  vec2 bp = p;
  for (float i = 1.0; i < 7.0; i++) {
    bp += time * 1.5;
    vec2 gr = vec2(grid(p * 3.0 - time * 2.0), grid(p * 3.0 + 4.0 - time * 2.0)) * 0.4;
    gr = normalize(gr) * 0.4;
    gr *= makem2((p.x + p.y) * .3 + time * 10.0);
    p += gr * 0.5;
    rz += (sin(noise(p) * 2.0) * 0.5 + 0.5) / z;
    p = mix(bp, p, .5);
    z *= 1.7;
    p *= 2.5;
    p *= m2;
    bp *= 2.5;
    bp *= m2;
  }
  return rz;
}

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
  // Gold-cyan color scheme matching ORION brand
  vec3 col = 0.5 + 0.5 * cos(6.28319 * (vec3(0.08, 0.15, 0.35) + amount * 0.9 * vec3(1.0, 0.6, 0.8)));
  return col * amount * cos(p.z) * 2.2;
}

void main() {
  vec2 p = gl_FragCoord.xy / iResolution.xy - 0.5;
  p.x *= iResolution.x / iResolution.y;
  p *= 0.5 + 0.1 - iGlobalTime * 0.00001;

  vec3 rd = normalize(vec3(2.0 * gl_FragCoord.xy - iResolution.xy, -iResolution.y));
  vec3 ro = vec3(cos(iGlobalTime * 0.1) * 0.1, 0.0,
    mix(1.0, (cos(iGlobalTime * 0.1)) * 0.1 + 1.6, -0.3 + Sin01(0.05 * iGlobalTime)));

  R(rd.xz, 0.2 * iGlobalTime);
  R(ro.xz, 0.2 * iGlobalTime);
  R(rd.yz, 0.05 * iGlobalTime);
  R(ro.yz, 0.05 * iGlobalTime);

  float t = 0.0;
  gl_FragColor = vec4(0.0);

  float scale = mix(0.05, 5.0, Sin01(0.068 * iGlobalTime * 0.2));

  for (int i = 0; i < 64; i++) {
    vec3 pos = ro + t * rd;
    float d = Map(pos, scale);
    if (t > 5.0 || d < 0.0001) break;
    t += 1.0 * d;
    gl_FragColor.rgb += 0.03 * GetColor(pos) * 0.9;
  }

  // Subtle vignette
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float vignette = 1.0 - 0.4 * length(uv - 0.5);
  gl_FragColor.rgb *= vignette;
  gl_FragColor.a = 1.0;
}
`;

function AlienCorePlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const noiseTex = useMemo(() => createNoiseTexture(), []);

  const uniforms = useMemo(
    () => ({
      iGlobalTime: { value: 10000.0 },
      iResolution: { value: new THREE.Vector2(size.width, size.height) },
      iChannel0: { value: noiseTex },
    }),
    [noiseTex]
  );

  useFrame(({ clock }) => {
    uniforms.iGlobalTime.value = 10000.0 + clock.getElapsedTime();
  });

  // Keep resolution updated
  uniforms.iResolution.value.set(size.width, size.height);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function AlienCoreScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 1], fov: 45 }}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      dpr={[0.5, 1]}
      style={{ position: "absolute", inset: 0 }}
    >
      <AlienCorePlane />
    </Canvas>
  );
}

export function AlienCoreBackground() {
  return (
    <div className="fixed inset-0 z-0" style={{ pointerEvents: "none" }}>
      <ShaderErrorBoundary>
        <AlienCoreScene />
      </ShaderErrorBoundary>
      {/* Subtle overlay for readability — not too dark */}
      <div className="absolute inset-0 bg-background/30" />
    </div>
  );
}
