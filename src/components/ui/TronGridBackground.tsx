import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Floating neon blocks in perspective — inspired by Tron-style glass panels */
function FloatingBlocks({ count = 40 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const blocks = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 16,
      y: (Math.random() - 0.5) * 8,
      z: -Math.random() * 20 - 2,
      sx: 0.3 + Math.random() * 1.2,
      sy: 0.15 + Math.random() * 0.6,
      speed: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      color: i % 3 === 0 ? 0 : 1, // 0=cyan, 1=gold
    }));
  }, [count]);

  const cyanColor = useMemo(() => new THREE.Color("#00bcd4"), []);
  const goldColor = useMemo(() => new THREE.Color("#D4AF37"), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    blocks.forEach((b, i) => {
      dummy.position.set(
        b.x + Math.sin(t * 0.3 + b.phase) * 0.3,
        b.y + Math.sin(t * b.speed + b.phase) * 0.5,
        b.z + ((t * b.speed * 0.5) % 4) - 2
      );
      dummy.scale.set(b.sx, b.sy, 0.02);
      dummy.rotation.set(
        Math.sin(t * 0.2 + b.phase) * 0.1,
        Math.sin(t * 0.15 + b.phase) * 0.15,
        0
      );
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      const c = b.color === 0 ? cyanColor : goldColor;
      meshRef.current!.setColorAt(i, c);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0.08} toneMapped={false} />
    </instancedMesh>
  );
}

/** Horizontal light streaks */
function LightStreaks() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const t = clock.getElapsedTime();
      mesh.position.x = ((t * (0.5 + i * 0.3) + i * 3) % 20) - 10;
    });
  });

  const streaks = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      y: (i - 3) * 1.5 + (Math.random() - 0.5),
      z: -5 - Math.random() * 10,
      width: 2 + Math.random() * 4,
      color: i % 2 === 0 ? "#00bcd4" : "#D4AF37",
    })),
  []);

  return (
    <group ref={ref}>
      {streaks.map((s, i) => (
        <mesh key={i} position={[0, s.y, s.z]}>
          <planeGeometry args={[s.width, 0.02]} />
          <meshBasicMaterial color={s.color} transparent opacity={0.15} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Perspective grid floor */
function GridFloor() {
  const ref = useRef<THREE.GridHelper>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.z = ((clock.getElapsedTime() * 0.4) % 2) - 1;
    }
  });
  return (
    <gridHelper
      ref={ref}
      args={[30, 30, "#00bcd415", "#D4AF3708"]}
      position={[0, -3.5, -5]}
    />
  );
}

interface TronGridBackgroundProps {
  className?: string;
  blockCount?: number;
}

export function TronGridBackground({ className = "", blockCount = 40 }: TronGridBackgroundProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <FloatingBlocks count={blockCount} />
        <LightStreaks />
        <GridFloor />
      </Canvas>
    </div>
  );
}
