import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function ParticleField({ count = 800, color = "#00D4FF" }: { count?: number; color?: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
      ref.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color={color} size={0.03} sizeAttenuation depthWrite={false} opacity={0.6} />
    </Points>
  );
}

function GridPlane() {
  const ref = useRef<THREE.GridHelper>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.z = ((ref.current.position.z + delta * 0.3) % 2) - 1;
    }
  });
  return (
    <gridHelper
      ref={ref}
      args={[40, 40, "#D4AF3715", "#00D4FF08"]}
      position={[0, -3, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

interface OrionBackground3DProps {
  variant?: "default" | "gold" | "cyan" | "mixed";
  intensity?: "low" | "medium" | "high";
  className?: string;
}

export function OrionBackground3D({ variant = "default", intensity = "medium", className = "" }: OrionBackground3DProps) {
  const count = intensity === "low" ? 400 : intensity === "high" ? 1200 : 800;
  const color = variant === "gold" ? "#D4AF37" : variant === "cyan" ? "#00D4FF" : "#00D4FF";

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.1} />
        <ParticleField count={count} color={color} />
        {variant === "mixed" && <ParticleField count={count / 2} color="#D4AF37" />}
        <GridPlane />
      </Canvas>
      {/* Scanline overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
