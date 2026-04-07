import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Neon tunnel ring that pulses and glows */
function TunnelRings({ count = 12 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const rings = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      z: -i * 2.5,
      scale: 2 + i * 0.15,
      phase: i * 0.4,
      color: i % 3 === 0 ? "#D4AF37" : "#00bcd4",
    })),
  [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const ring = rings[i];
      if (!ring) return;
      // Move toward camera, loop back
      mesh.position.z = ring.z + ((t * 1.5) % (count * 2.5));
      if (mesh.position.z > 3) mesh.position.z -= count * 2.5;

      const pulse = 0.8 + Math.sin(t * 2 + ring.phase) * 0.2;
      mesh.scale.set(ring.scale * pulse, ring.scale * pulse, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        THREE.MathUtils.clamp(0.12 - Math.abs(mesh.position.z) * 0.005, 0.02, 0.15);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, 0, r.z]} rotation={[0, 0, i * 0.05]}>
          <ringGeometry args={[0.95, 1, 64]} />
          <meshBasicMaterial color={r.color} transparent opacity={0.1} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Floor grid lines rushing toward camera */
function RushLines() {
  const ref = useRef<THREE.Group>(null);

  const lines = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      x: (i - 10) * 0.8,
      color: i % 4 === 0 ? "#D4AF37" : "#00bcd4",
    })),
  []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.z = ((clock.getElapsedTime() * 2) % 3);
  });

  return (
    <group ref={ref} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {lines.map((l, i) => (
        <mesh key={i} position={[l.x, 0, 0]}>
          <planeGeometry args={[0.01, 30]} />
          <meshBasicMaterial color={l.color} transparent opacity={0.06} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Floating particles along corridor */
function CorridorParticles({ count = 200 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 6;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 4;
      arr[i * 3 + 2] = -Math.random() * 30;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.1) * 0.02;
    // Move particles toward camera
    const pos = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let z = (pos.array as Float32Array)[i * 3 + 2];
      z += 0.03;
      if (z > 2) z = -28;
      (pos.array as Float32Array)[i * 3 + 2] = z;
    }
    pos.needsUpdate = true;
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
      <pointsMaterial color="#00bcd4" size={0.03} transparent opacity={0.4} sizeAttenuation depthWrite={false} />
    </points>
  );
}

interface NeonCorridorBackgroundProps {
  className?: string;
}

export function NeonCorridorBackground({ className = "" }: NeonCorridorBackgroundProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 65, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <TunnelRings count={14} />
        <RushLines />
        <CorridorParticles count={150} />
      </Canvas>
    </div>
  );
}
