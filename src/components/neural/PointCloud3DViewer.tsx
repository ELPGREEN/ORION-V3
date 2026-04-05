/**
 * ─── PointCloud3DViewer ───
 * React Three Fiber component to visualize 3D scene reconstructions.
 * Shows point cloud + labeled bounding boxes for detected objects.
 */

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import type { SceneReconstruction, Object3D } from "@/lib/neural/scene-reconstruction-3d";

// ─── Point Cloud mesh ───

interface PointCloudProps {
  points: Float32Array;
  pointCount: number;
  pointSize?: number;
}

function PointCloud({ points, pointCount, pointSize = 2 }: PointCloudProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      const srcOff = i * 6;
      const dstOff = i * 3;
      positions[dstOff] = points[srcOff];       // x
      positions[dstOff + 1] = points[srcOff + 1]; // y
      positions[dstOff + 2] = points[srcOff + 2]; // z
      colors[dstOff] = points[srcOff + 3];       // r
      colors[dstOff + 1] = points[srcOff + 4];   // g
      colors[dstOff + 2] = points[srcOff + 5];   // b
    }

    return { positions, colors };
  }, [points, pointCount]);

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometryRef.current.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometryRef.current.computeBoundingSphere();
    }
  }, [positions, colors]);

  return (
    <points>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        size={pointSize * 0.01}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  );
}

// ─── Object bounding box ───

interface ObjectBoxProps {
  object3D: Object3D;
  showLabel?: boolean;
}

function ObjectBox({ object3D, showLabel = true }: ObjectBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(object3D.color), [object3D.color]);

  return (
    <group position={[object3D.position.x, object3D.position.y, object3D.position.z]}>
      {/* Wireframe bounding box */}
      <mesh ref={meshRef}>
        <boxGeometry args={[object3D.size.width, object3D.size.height, object3D.size.depth]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.6} />
      </mesh>

      {/* Semi-transparent fill */}
      <mesh>
        <boxGeometry args={[object3D.size.width, object3D.size.height, object3D.size.depth]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>

      {/* Label */}
      {showLabel && (
        <Html
          position={[0, object3D.size.height / 2 + 0.15, 0]}
          center
          distanceFactor={5}
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap font-mono">
            {object3D.labelPt} • {object3D.distanceM}m
            <br />
            <span className="text-[10px] opacity-70">
              {(object3D.confidence * 100).toFixed(0)}% conf
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Grid / reference plane ───

function SceneGrid() {
  return (
    <group>
      <gridHelper args={[20, 40, "#334155", "#1e293b"]} position={[0, -2, -5]} />
      {/* Axis helper */}
      <axesHelper args={[1]} position={[0, -2, 0]} />
    </group>
  );
}

// ─── Camera auto-fit ───

function CameraController({ bounds }: { bounds: SceneReconstruction["bounds"] }) {
  const { camera } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;
      const rangeZ = Math.abs(bounds.maxZ - bounds.minZ);

      camera.position.set(centerX, centerY + 1, centerZ + rangeZ * 0.8 + 2);
      camera.lookAt(centerX, centerY, centerZ);
      initialized.current = true;
    }
  }, [bounds, camera]);

  return null;
}

// ─── Main component ───

interface PointCloud3DViewerProps {
  scene: SceneReconstruction | null;
  className?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  pointSize?: number;
  autoRotate?: boolean;
}

const PointCloud3DViewer: React.FC<PointCloud3DViewerProps> = ({
  scene,
  className = "",
  showGrid = true,
  showLabels = true,
  pointSize = 2,
  autoRotate = false,
}) => {
  if (!scene || scene.pointCount === 0) {
    return (
      <div className={`flex items-center justify-center bg-background/50 rounded-lg border border-border ${className}`}>
        <div className="text-center text-muted-foreground p-4">
          <div className="text-3xl mb-2">📡</div>
          <p className="text-sm">Aguardando reconstrução 3D...</p>
          <p className="text-xs mt-1 opacity-60">Ative a câmera e o módulo de profundidade</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-border bg-[#0a0a12] ${className}`}>
      {/* Stats overlay */}
      <div className="absolute top-2 left-2 z-10 bg-black/70 text-green-400 px-2 py-1 rounded text-[10px] font-mono">
        {scene.pointCount.toLocaleString()} pts • {scene.objects.length} objs • {scene.meta.reconstructionMs}ms
      </div>

      <Canvas
        camera={{ fov: 60, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0a0a12"]} />
        <ambientLight intensity={0.5} />

        <CameraController bounds={scene.bounds} />

        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.05}
          minDistance={0.5}
          maxDistance={30}
        />

        {/* Point cloud */}
        <PointCloud
          points={scene.points}
          pointCount={scene.pointCount}
          pointSize={pointSize}
        />

        {/* Object bounding boxes */}
        {scene.objects.map((obj) => (
          <ObjectBox
            key={obj.id}
            object3D={obj}
            showLabel={showLabels}
          />
        ))}

        {showGrid && <SceneGrid />}
      </Canvas>
    </div>
  );
};

export default PointCloud3DViewer;
