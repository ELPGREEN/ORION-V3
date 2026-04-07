import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Concentric rotating rings with tick marks — HUD style */
function HudRing({ radius, color, speed, segments = 64 }: {
  radius: number; color: string; speed: number; segments?: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed;
    }
  });

  // Create dashed ring with gaps
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      // Create gaps every N segments
      if (i % 8 < 6) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      } else {
        // gap — push NaN to break line (handled by segments)
      }
    }
    return pts;
  }, [radius, segments]);

  return (
    <group ref={ref}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
            count={points.length}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.2} />
      </line>
      {/* Tick marks at cardinal positions */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        const inner = radius - 0.08;
        const outer = radius + 0.08;
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([
                  Math.cos(a) * inner, Math.sin(a) * inner, 0,
                  Math.cos(a) * outer, Math.sin(a) * outer, 0,
                ]), 3]}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={color} transparent opacity={0.25} />
          </line>
        );
      })}
    </group>
  );
}

/** Orbiting data points */
function DataNodes({ count = 16, radius = 2.5 }: { count?: number; radius?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radius + (Math.random() - 0.5) * 0.8;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.sin(a) * r;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    return arr;
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = -clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#D4AF37" size={0.06} transparent opacity={0.6} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Central pulsing core */
function CoreGlow() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 0.3 + Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
    ref.current.scale.set(s, s, 1);
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      0.15 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
  });

  return (
    <mesh ref={ref}>
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial color="#00bcd4" transparent opacity={0.15} toneMapped={false} />
    </mesh>
  );
}

interface CircuitRingsBackgroundProps {
  className?: string;
}

export function CircuitRingsBackground({ className = "" }: CircuitRingsBackgroundProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        {/* Multiple concentric rings rotating at different speeds */}
        <HudRing radius={3.2} color="#00bcd4" speed={0.08} />
        <HudRing radius={2.6} color="#D4AF37" speed={-0.05} segments={48} />
        <HudRing radius={2.0} color="#00bcd4" speed={0.12} segments={32} />
        <HudRing radius={1.4} color="#D4AF37" speed={-0.09} />
        <HudRing radius={0.8} color="#00bcd4" speed={0.15} segments={24} />

        <DataNodes count={20} radius={2.8} />
        <DataNodes count={12} radius={1.7} />
        <CoreGlow />
      </Canvas>
    </div>
  );
}
