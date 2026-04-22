// @ts-nocheck
import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text, Float, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

interface QuantumNode {
  id: string;
  position: THREE.Vector3;
  color: string;
  size: number;
  label: string;
  category: "core" | "expert" | "vision" | "cognition" | "memory" | "action" | "defense" | "io";
}

interface QuantumLink {
  source: THREE.Vector3;
  target: THREE.Vector3;
  strength: number;
  color: string;
  active: boolean;
}

function QuantumNeuron({ position, color, size, label, active, pulse }: {
  position: THREE.Vector3;
  color: string;
  size: number;
  label: string;
  active: boolean;
  pulse: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    
    meshRef.current.rotation.x = t * 0.3;
    meshRef.current.rotation.y = t * 0.5;
    
    const scale = 1 + Math.sin(t * 3 + pulse) * 0.15;
    meshRef.current.scale.setScalar(scale);
    
    if (glowRef.current) {
      glowRef.current.scale.setScalar(size * 2.5 * (1 + Math.sin(t * 4) * 0.2));
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 5) * 0.1;
    }
    
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5;
      ringRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
    }
  });

  const coreColor = new THREE.Color(color);
  const glowColor = new THREE.Color(color).multiplyScalar(2);

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 2, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[size, 2]} />
        <meshPhysicalMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={active ? 2 : 0.5}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      <mesh ref={ringRef}>
        <torusGeometry args={[size * 1.5, 0.02, 8, 32]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.6} />
      </mesh>
      
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        <Text
          position={[0, size + 0.3, 0]}
          fontSize={0.12}
          color={color}
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter-bold.woff"
        >
          {label}
        </Text>
      </Float>
    </group>
  );
}

function QuantumBeam({ start, end, color, intensity }: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  intensity: number;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  const { positions, curve } = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += (Math.random() - 0.5) * 0.5;
    
    const curve = new THREE.QuadraticBezierCurve3(start.clone(), mid, end.clone());
    const points = curve.getPoints(50);
    const positions = new Float32Array(points.length * 3);
    
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    
    return { positions, curve };
  }, [start, end]);

  const particlePositions = useMemo(() => {
    const count = 20;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const point = curve.getPoint(t);
      pos[i * 3] = point.x + (Math.random() - 0.5) * 0.1;
      pos[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.1;
      pos[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.1;
    }
    return pos;
  }, [curve]);

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < positions.length / 3; i++) {
        const t = (i / (positions.length / 3) + time * 0.5) % 1;
        const point = curve.getPoint(t);
        positions[i * 3] = point.x + Math.sin(time * 3 + i) * 0.05;
        positions[i * 3 + 1] = point.y + Math.cos(time * 3 + i) * 0.05;
        positions[i * 3 + 2] = point.z;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={intensity * 0.4} blending={THREE.AdditiveBlending} />
      </line>
      
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.08} transparent opacity={intensity} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function QuantumCore({ active }: { active: boolean }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.5;
      coreRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }
    
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring, i) => {
        ring.rotation.x = t * (0.2 + i * 0.1);
        ring.rotation.y = t * (0.15 + i * 0.05);
        ring.rotation.z = t * (0.1 + i * 0.08);
      });
    }
    
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        const idx = i * 3;
        const x = positions[idx];
        const y = positions[idx + 1];
        const z = positions[idx + 2];
        const len = Math.sqrt(x*x + y*y + z*z);
        const newLen = len + Math.sin(t * 2 + i * 0.1) * 0.01;
        positions[idx] = x * newLen / len;
        positions[idx + 1] = y * newLen / len;
        positions[idx + 2] = z * newLen / len;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const particlePositions = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 0.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  const ringGeometry = useMemo(() => {
    return [2, 2.3, 2.6, 2.9].map(r => (
      <mesh key={r}>
        <torusGeometry args={[r, 0.015, 8, 64]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.3} />
      </mesh>
    ));
  }, []);

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.5, 3]} />
        <meshPhysicalMaterial
          color="#001a33"
          emissive="#00e5ff"
          emissiveIntensity={active ? 1.5 : 0.3}
          metalness={1}
          roughness={0}
          transparent
          opacity={0.95}
        />
      </mesh>
      
      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
      
      <group ref={ringsRef}>
        {ringGeometry}
      </group>
      
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#00e5ff" size={0.03} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function NeuralNetwork3D({ nodes, links, activeNodes }: {
  nodes: QuantumNode[];
  links: QuantumLink[];
  activeNodes: Set<string>;
}) {
  return (
    <group>
      {links.map((link, i) => (
        <QuantumBeam
          key={i}
          start={link.source}
          end={link.target}
          color={link.color}
          intensity={link.active ? link.strength : 0.2}
        />
      ))}
      
      {nodes.map((node) => (
        <QuantumNeuron
          key={node.id}
          position={node.position}
          color={node.color}
          size={node.size}
          label={node.label}
          active={activeNodes.has(node.id)}
          pulse={Math.random() * Math.PI * 2}
        />
      ))}
    </group>
  );
}

function BrainGrid() {
  const gridRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={gridRef}>
      <gridHelper args={[30, 30, "#0a2a3a", "#061520"]} position={[0, -4, 0]} />
      <gridHelper args={[30, 60, "#0a2a3a", "#041015"]} position={[0, -4.1, 0]} />
    </group>
  );
}

export default function JarvisNeuralBrain({ isRunning = true }: { isRunning?: boolean }) {
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set(["llm_core", "rag_engine"]));

  const nodes: QuantumNode[] = useMemo(() => [
    { id: "core", position: new THREE.Vector3(0, 0, 0), color: "#00e5ff", size: 0.5, label: "QUANTUM CORE", category: "core" },
    { id: "llm", position: new THREE.Vector3(2, 1, 0), color: "#00e5ff", size: 0.3, label: "LLM CORE", category: "core" },
    { id: "rag", position: new THREE.Vector3(-2, 1, 0), color: "#00e5ff", size: 0.3, label: "RAG ENGINE", category: "core" },
    { id: "router", position: new THREE.Vector3(0, 2, 0), color: "#b388ff", size: 0.25, label: "ROUTER", category: "core" },
    { id: "deepseek", position: new THREE.Vector3(3, 2, 1), color: "#69f0ae", size: 0.2, label: "DEEPSEEK", category: "expert" },
    { id: "groq", position: new THREE.Vector3(3, 2, -1), color: "#69f0ae", size: 0.2, label: "GROQ", category: "expert" },
    { id: "gemini", position: new THREE.Vector3(4, 1, 0), color: "#69f0ae", size: 0.2, label: "GEMINI", category: "expert" },
    { id: "vision", position: new THREE.Vector3(-3, 2, 0), color: "#ea80fc", size: 0.25, label: "VISION", category: "vision" },
    { id: "cognition", position: new THREE.Vector3(0, -2, 0), color: "#ff80ab", size: 0.3, label: "COGNITION", category: "cognition" },
    { id: "memory", position: new THREE.Vector3(-2, -1, 1), color: "#ffd740", size: 0.25, label: "MEMORY", category: "memory" },
    { id: "action", position: new THREE.Vector3(2, -1, 1), color: "#ccff90", size: 0.25, label: "ACTION", category: "action" },
    { id: "defense", position: new THREE.Vector3(0, 0, 2), color: "#ff1744", size: 0.2, label: "DEFENSE", category: "defense" },
    { id: "io", position: new THREE.Vector3(0, 3, 0), color: "#18ffff", size: 0.2, label: "I/O", category: "io" },
  ], []);

  const links: QuantumLink[] = useMemo(() => [
    { source: new THREE.Vector3(0, 3, 0), target: new THREE.Vector3(0, 2, 0), strength: 1, color: "#00e5ff", active: true },
    { source: new THREE.Vector3(0, 2, 0), target: new THREE.Vector3(0, 0, 0), strength: 1, color: "#b388ff", active: true },
    { source: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(2, 1, 0), strength: 0.9, color: "#00e5ff", active: true },
    { source: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(-2, 1, 0), strength: 0.9, color: "#00e5ff", active: true },
    { source: new THREE.Vector3(0, 2, 0), target: new THREE.Vector3(3, 2, 1), strength: 0.7, color: "#69f0ae", active: true },
    { source: new THREE.Vector3(0, 2, 0), target: new THREE.Vector3(3, 2, -1), strength: 0.7, color: "#69f0ae", active: true },
    { source: new THREE.Vector3(0, 2, 0), target: new THREE.Vector3(4, 1, 0), strength: 0.6, color: "#69f0ae", active: true },
    { source: new THREE.Vector3(0, 2, 0), target: new THREE.Vector3(-3, 2, 0), strength: 0.7, color: "#ea80fc", active: true },
    { source: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(0, -2, 0), strength: 0.8, color: "#ff80ab", active: true },
    { source: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(-2, -1, 1), strength: 0.7, color: "#ffd740", active: true },
    { source: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(2, -1, 1), strength: 0.7, color: "#ccff90", active: true },
    { source: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(0, 0, 2), strength: 0.6, color: "#ff1744", active: true },
    { source: new THREE.Vector3(2, 1, 0), target: new THREE.Vector3(2, -1, 1), strength: 0.5, color: "#00e5ff", active: false },
    { source: new THREE.Vector3(-2, 1, 0), target: new THREE.Vector3(-2, -1, 1), strength: 0.5, color: "#00e5ff", active: false },
    { source: new THREE.Vector3(0, -2, 0), target: new THREE.Vector3(-2, -1, 1), strength: 0.6, color: "#ff80ab", active: true },
    { source: new THREE.Vector3(0, -2, 0), target: new THREE.Vector3(2, -1, 1), strength: 0.6, color: "#ff80ab", active: true },
  ], []);

  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      const allNodes = nodes.map(n => n.id);
      const newActive = new Set<string>();
      const count = Math.floor(Math.random() * 5) + 3;
      
      for (let i = 0; i < count; i++) {
        newActive.add(allNodes[Math.floor(Math.random() * allNodes.length)]);
      }
      newActive.add("core");
      
      setActiveNodes(newActive);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isRunning, nodes]);

  return (
    <Canvas
      camera={{ position: [8, 5, 8], fov: 50 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#000810"]} />
      
      <fog attach="fog" args={["#000810", 10, 40]} />
      
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#00e5ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ff80ab" />
      
      <Stars radius={50} depth={50} count={2000} factor={4} fade speed={1} />
      
      <BrainGrid />
      
      <NeuralNetwork3D nodes={nodes} links={links} activeNodes={activeNodes} />
      
      <QuantumCore active={isRunning} />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={5}
        maxDistance={20}
      />
      
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.001, 0.001]}
        />
        <Vignette darkness={0.5} offset={0.3} />
      </EffectComposer>
    </Canvas>
  );
}
