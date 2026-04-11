import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity, Zap, Brain, Cpu, Database, Eye, Pause, Play,
  RotateCcw, Wifi, Bluetooth, Shield,
  Maximize2, Minimize2, Layers, Lock, Radio,
} from "lucide-react";
import { getDefenseMetrics } from "@/lib/neural/orion-defense-system";
import { supabase } from "@/integrations/supabase/client";

// ─── ORION BRAIN ARCHITECTURE: Nodes on a Globe ───
const NEURAL_NODES = [
  // Core LLM — Transformer/Attention Networks
  { id: "llm_core", label: "LLM Core", category: "core", color: "#00e5ff", size: 0.35, arch: "Transformer" },
  { id: "rag_engine", label: "RAG Engine", category: "core", color: "#00e5ff", size: 0.3, arch: "FFN+Retrieval" },
  { id: "kv_cache", label: "KV Cache", category: "core", color: "#ffd740", size: 0.25, arch: "NTM Memory" },
  { id: "slim_router", label: "SlimRouter", category: "core", color: "#b388ff", size: 0.28, arch: "Perceptron" },
  { id: "som_router", label: "SOM Router", category: "core", color: "#b388ff", size: 0.22, arch: "Kohonen SOM" },
  { id: "mha", label: "MHA 7-Head", category: "core", color: "#00e5ff", size: 0.26, arch: "Attention" },
  // Expert Models — MoE
  { id: "moe_gate", label: "MoE Gate", category: "experts", color: "#69f0ae", size: 0.25, arch: "Gated MoE" },
  { id: "deepseek", label: "DeepSeek Δ", category: "experts", color: "#69f0ae", size: 0.22, arch: "DRN" },
  { id: "groq", label: "Groq Alpha", category: "experts", color: "#69f0ae", size: 0.22, arch: "Transformer" },
  { id: "gemini", label: "Gemini Beta", category: "experts", color: "#69f0ae", size: 0.22, arch: "Transformer" },
  { id: "mistral", label: "Mistral Gamma", category: "experts", color: "#69f0ae", size: 0.22, arch: "Transformer" },
  { id: "openrouter", label: "OpenRouter ε", category: "experts", color: "#69f0ae", size: 0.2, arch: "Router FFN" },
  { id: "huggingface", label: "HuggingFace", category: "experts", color: "#69f0ae", size: 0.2, arch: "Inference API" },
  // Vision & Multimodal
  { id: "vlm", label: "VLM", category: "vision", color: "#ea80fc", size: 0.25, arch: "DCIGN" },
  { id: "sam", label: "SAM", category: "vision", color: "#84ffff", size: 0.22, arch: "CNN+Decoder" },
  { id: "yolo", label: "YOLOv8", category: "vision", color: "#ea80fc", size: 0.22, arch: "CNN" },
  { id: "mediapipe", label: "MediaPipe", category: "vision", color: "#ea80fc", size: 0.2, arch: "CNN+BlazeNet" },
  { id: "ocr", label: "OCR Engine", category: "vision", color: "#84ffff", size: 0.2, arch: "CNN+RNN" },
  { id: "clip", label: "CLIP Cross-Modal", category: "vision", color: "#ea80fc", size: 0.2, arch: "Contrastive" },
  // Neural Cognition
  { id: "cognition", label: "Cognição", category: "cognition", color: "#ff80ab", size: 0.28, arch: "GWT" },
  { id: "tom", label: "Teoria da Mente", category: "cognition", color: "#ff80ab", size: 0.22, arch: "RNN" },
  { id: "causal", label: "Raciocínio Causal", category: "cognition", color: "#ff80ab", size: 0.22, arch: "GNN" },
  { id: "metacog", label: "Meta-Cognição", category: "cognition", color: "#ff80ab", size: 0.22, arch: "DNC" },
  { id: "somatic", label: "Marcadores Somáticos", category: "cognition", color: "#ff80ab", size: 0.2, arch: "ESN" },
  { id: "stdp", label: "STDP Gamma", category: "cognition", color: "#ff80ab", size: 0.2, arch: "LSM" },
  // Memory & Knowledge
  { id: "pgvector", label: "pgVector", category: "memory", color: "#ffd740", size: 0.25, arch: "FAISS/IVF" },
  { id: "embeddings", label: "Embeddings", category: "memory", color: "#ffd740", size: 0.22, arch: "AE 768d" },
  { id: "episodic", label: "Memória Episódica", category: "memory", color: "#ffd740", size: 0.22, arch: "LSTM" },
  { id: "knowledge", label: "Knowledge Base", category: "memory", color: "#ffd740", size: 0.2, arch: "DBN" },
  { id: "hopfield", label: "Hopfield Net", category: "memory", color: "#ffd740", size: 0.2, arch: "Hopfield" },
  // Action & Output
  { id: "lam", label: "LAM", category: "action", color: "#ccff90", size: 0.25, arch: "Transformer" },
  { id: "mamba", label: "Mamba SSM", category: "action", color: "#448aff", size: 0.25, arch: "SSM O(n)" },
  { id: "mlm", label: "MLM Masked", category: "action", color: "#ff5252", size: 0.22, arch: "BERT-like" },
  // Defense & Quality
  { id: "defense", label: "Orion Shield", category: "defense", color: "#ff1744", size: 0.28, arch: "GAN Guard" },
  { id: "llm_judge", label: "LLM Judge", category: "defense", color: "#ffab40", size: 0.22, arch: "Critic Net" },
  { id: "quantum_psi", label: "Ψ Quantum", category: "defense", color: "#c084fc", size: 0.25, arch: "QNN/RBM" },
  { id: "active_inf", label: "Active Inference", category: "defense", color: "#ff1744", size: 0.2, arch: "VAE" },
  { id: "wta", label: "WTA Competitive", category: "defense", color: "#ffab40", size: 0.18, arch: "Kohonen" },
  // I/O
  { id: "input_text", label: "Texto", category: "io", color: "#18ffff", size: 0.2, arch: "Tokenizer" },
  { id: "input_voice", label: "Voz", category: "io", color: "#18ffff", size: 0.2, arch: "RNN/CTC" },
  { id: "input_vision", label: "Visão", category: "io", color: "#18ffff", size: 0.2, arch: "CNN" },
  { id: "output", label: "Output", category: "io", color: "#18ffff", size: 0.25, arch: "Decoder" },
  { id: "iot_ble", label: "IoT/BLE", category: "io", color: "#60a5fa", size: 0.18, arch: "MQTT" },
  { id: "mqtt", label: "MQTT", category: "io", color: "#60a5fa", size: 0.18, arch: "PubSub" },
  // Federation
  { id: "digital_twin", label: "Digital Twin", category: "federation", color: "#7c4dff", size: 0.22, arch: "GAN Mirror" },
  { id: "a2a", label: "A2A Protocol", category: "federation", color: "#7c4dff", size: 0.2, arch: "P2P" },
  { id: "mcp", label: "MCP Bridge", category: "federation", color: "#7c4dff", size: 0.2, arch: "RPC" },
  { id: "child_net", label: "Child Network", category: "federation", color: "#7c4dff", size: 0.18, arch: "Federated" },
  // Search & Data
  { id: "firecrawl", label: "Firecrawl", category: "search", color: "#ffab40", size: 0.18, arch: "Crawler" },
  { id: "searxng", label: "SearXNG", category: "search", color: "#ffab40", size: 0.18, arch: "Meta-Search" },
  { id: "datajud", label: "DataJud", category: "search", color: "#ffab40", size: 0.18, arch: "API Legal" },
  { id: "lexml", label: "LexML", category: "search", color: "#ffab40", size: 0.18, arch: "API Legal" },
  // Arch Zoo
  { id: "rbf_gate", label: "RBF Gate", category: "core", color: "#b388ff", size: 0.2, arch: "RBF" },
  { id: "gru_health", label: "GRU Health", category: "defense", color: "#ff1744", size: 0.18, arch: "GRU" },
  { id: "dae_cleaner", label: "DAE Cleaner", category: "memory", color: "#ffd740", size: 0.18, arch: "DAE" },
  { id: "sae_features", label: "SAE Features", category: "memory", color: "#ffd740", size: 0.18, arch: "SAE" },
  { id: "markov_chain", label: "Markov Chain", category: "cognition", color: "#ff80ab", size: 0.18, arch: "MC" },
  { id: "boltzmann", label: "Boltzmann", category: "defense", color: "#c084fc", size: 0.18, arch: "BM" },
  { id: "deconv_gen", label: "Deconv Gen", category: "vision", color: "#ea80fc", size: 0.18, arch: "DN" },
  { id: "elm_fast", label: "ELM Fast", category: "experts", color: "#69f0ae", size: 0.18, arch: "ELM" },
  { id: "capsnet", label: "CapsNet", category: "vision", color: "#84ffff", size: 0.18, arch: "CapsNet" },
];

const CONNECTIONS: [string, string][] = [
  ["input_text", "slim_router"], ["input_voice", "slim_router"], ["input_vision", "vlm"],
  ["slim_router", "llm_core"], ["slim_router", "som_router"], ["som_router", "moe_gate"],
  ["slim_router", "mha"],
  ["llm_core", "rag_engine"], ["llm_core", "kv_cache"], ["rag_engine", "pgvector"],
  ["rag_engine", "embeddings"], ["rag_engine", "knowledge"],
  ["mha", "llm_core"], ["mha", "cognition"],
  ["moe_gate", "deepseek"], ["moe_gate", "groq"], ["moe_gate", "gemini"],
  ["moe_gate", "mistral"], ["moe_gate", "openrouter"], ["moe_gate", "huggingface"],
  ["deepseek", "llm_core"], ["groq", "llm_core"], ["gemini", "llm_core"],
  ["huggingface", "llm_core"],
  ["vlm", "yolo"], ["vlm", "sam"], ["vlm", "mediapipe"], ["yolo", "ocr"],
  ["vlm", "cognition"], ["vlm", "clip"], ["clip", "cognition"],
  ["llm_core", "cognition"], ["cognition", "tom"], ["cognition", "causal"],
  ["cognition", "metacog"], ["cognition", "somatic"], ["cognition", "stdp"],
  ["tom", "llm_core"], ["causal", "llm_core"], ["stdp", "hopfield"],
  ["pgvector", "episodic"], ["embeddings", "knowledge"], ["episodic", "cognition"],
  ["hopfield", "episodic"], ["knowledge", "hopfield"],
  ["llm_core", "lam"], ["llm_core", "mamba"], ["llm_core", "mlm"],
  ["llm_core", "defense"], ["defense", "llm_judge"], ["defense", "quantum_psi"],
  ["defense", "active_inf"], ["defense", "wta"], ["llm_judge", "output"],
  ["lam", "output"], ["mamba", "output"], ["output", "iot_ble"], ["output", "mqtt"],
  ["llm_core", "digital_twin"], ["digital_twin", "a2a"], ["digital_twin", "mcp"],
  ["digital_twin", "child_net"], ["child_net", "a2a"],
  ["rag_engine", "firecrawl"], ["rag_engine", "searxng"], ["rag_engine", "datajud"],
  ["rag_engine", "lexml"],
  ["kv_cache", "moe_gate"], ["defense", "slim_router"], ["metacog", "defense"],
  ["quantum_psi", "cognition"], ["a2a", "output"], ["wta", "som_router"],
  ["active_inf", "cognition"], ["mamba", "mha"],
  ["slim_router", "rbf_gate"], ["rbf_gate", "moe_gate"],
  ["gru_health", "defense"], ["defense", "gru_health"],
  ["dae_cleaner", "embeddings"], ["embeddings", "dae_cleaner"],
  ["sae_features", "knowledge"], ["knowledge", "sae_features"],
  ["markov_chain", "causal"], ["cognition", "markov_chain"],
  ["boltzmann", "quantum_psi"], ["quantum_psi", "boltzmann"],
  ["vlm", "deconv_gen"], ["deconv_gen", "digital_twin"],
  ["moe_gate", "elm_fast"], ["elm_fast", "llm_core"],
  ["yolo", "capsnet"], ["capsnet", "clip"],
];

const GLOBE_RADIUS = 12;
const NUM_PARTICLES = 12000;
const NUM_FLOW_BEAMS = 80;

// ─── Fibonacci sphere ───
function computeGlobePositions() {
  const n = NEURAL_NODES.length;
  const positions: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    positions.push(new THREE.Vector3(
      Math.cos(theta) * radiusAtY * GLOBE_RADIUS,
      y * GLOBE_RADIUS,
      Math.sin(theta) * radiusAtY * GLOBE_RADIUS,
    ));
  }
  return positions;
}

// ─── Energy Core (center pulsing orb) ───
function EnergyCore({ paused }: { paused: boolean }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (paused) return;
    const t = clock.elapsedTime;
    if (coreRef.current) {
      const s = 1.8 + Math.sin(t * 1.5) * 0.3;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 2) * 0.08;
    }
    if (haloRef.current) {
      const s = 3.2 + Math.sin(t * 0.8) * 0.8;
      haloRef.current.scale.setScalar(s);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.04 + Math.sin(t * 1.2) * 0.02;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.4;
      ring1Ref.current.rotation.z = t * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = t * 0.35;
      ring2Ref.current.rotation.x = Math.PI / 3 + t * 0.2;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * 0.25;
      ring3Ref.current.rotation.y = Math.PI / 4 + t * 0.15;
    }
  });

  return (
    <group>
      {/* Inner core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Outer halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.05} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Orbital rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.8, 0.015, 8, 64]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[3.4, 0.012, 8, 64]} />
        <meshBasicMaterial color="#b388ff" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring3Ref}>
        <torusGeometry args={[4.0, 0.01, 8, 64]} />
        <meshBasicMaterial color="#69f0ae" transparent opacity={0.1} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ─── Globe wireframe (HD) ───
function GlobeWireframe() {
  const geo = useMemo(() => {
    const positions: number[] = [];
    for (let lat = -75; lat <= 75; lat += 15) {
      const rad = (lat * Math.PI) / 180;
      const r = Math.cos(rad) * GLOBE_RADIUS * 1.02;
      const y = Math.sin(rad) * GLOBE_RADIUS * 1.02;
      for (let i = 0; i < 96; i++) {
        const a1 = (i / 96) * Math.PI * 2;
        const a2 = ((i + 1) / 96) * Math.PI * 2;
        positions.push(Math.cos(a1) * r, y, Math.sin(a1) * r);
        positions.push(Math.cos(a2) * r, y, Math.sin(a2) * r);
      }
    }
    for (let lon = 0; lon < 180; lon += 15) {
      const rad = (lon * Math.PI) / 180;
      for (let i = 0; i < 96; i++) {
        const a1 = (i / 96) * Math.PI * 2;
        const a2 = ((i + 1) / 96) * Math.PI * 2;
        positions.push(Math.cos(a1) * GLOBE_RADIUS * 1.02 * Math.cos(rad), Math.sin(a1) * GLOBE_RADIUS * 1.02, Math.cos(a1) * GLOBE_RADIUS * 1.02 * Math.sin(rad));
        positions.push(Math.cos(a2) * GLOBE_RADIUS * 1.02 * Math.cos(rad), Math.sin(a2) * GLOBE_RADIUS * 1.02, Math.cos(a2) * GLOBE_RADIUS * 1.02 * Math.sin(rad));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#0d2847" transparent opacity={0.18} depthWrite={false} />
    </lineSegments>
  );
}

// ─── Connection curves ───
function ConnectionCurves({ paused }: { paused: boolean }) {
  const positions = useMemo(computeGlobePositions, []);
  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    NEURAL_NODES.forEach((n, i) => map.set(n.id, i));
    return map;
  }, []);

  const curves = useMemo(() => {
    return CONNECTIONS.map(([fromId, toId]) => {
      const fi = nodeIndexMap.get(fromId);
      const ti = nodeIndexMap.get(toId);
      if (fi === undefined || ti === undefined) return null;
      const from = positions[fi];
      const to = positions[ti];
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const outwardFactor = 1.18 + mid.length() * 0.02;
      mid.normalize().multiplyScalar(mid.length() > 0.1 ? from.length() * outwardFactor : GLOBE_RADIUS * 1.12);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const points = curve.getPoints(32);
      const fromNode = NEURAL_NODES[fi];
      return { points, color: fromNode.color };
    }).filter(Boolean) as { points: THREE.Vector3[]; color: string }[];
  }, [positions, nodeIndexMap]);

  const linesRef = useRef<THREE.Group>(null);
  const lineObjects = useMemo(() => {
    return curves.map((curve) => {
      const geo = new THREE.BufferGeometry().setFromPoints(curve.points);
      const mat = new THREE.LineBasicMaterial({
        color: curve.color,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.Line(geo, mat);
    });
  }, [curves]);

  useFrame(({ clock }) => {
    if (paused || !linesRef.current) return;
    const t = clock.elapsedTime;
    lineObjects.forEach((obj, i) => {
      (obj.material as THREE.LineBasicMaterial).opacity = 0.08 + Math.sin(t * 1.8 + i * 0.25) * 0.06;
    });
  });

  return (
    <group ref={linesRef}>
      {lineObjects.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </group>
  );
}

// ─── HD Node spheres with glow rings ───
function GlobeNodes({ paused, showLabels }: { paused: boolean; showLabels: boolean }) {
  const positions = useMemo(computeGlobePositions, []);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const glowRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    if (paused) return;
    const t = clock.elapsedTime;
    NEURAL_NODES.forEach((node, i) => {
      const mesh = meshRefs.current[i];
      const ring = ringRefs.current[i];
      const glow = glowRefs.current[i];
      if (mesh) {
        const pulse = 1 + Math.sin(t * 2.5 + i * 0.7) * 0.18;
        mesh.scale.setScalar(pulse);
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.7 + Math.sin(t * 3 + i * 0.5) * 0.4;
      }
      if (ring) {
        ring.rotation.x = t * 0.4 + i * 0.2;
        ring.rotation.y = t * 0.3 + i * 0.35;
        (ring.material as THREE.MeshBasicMaterial).opacity =
          0.15 + Math.sin(t * 2 + i * 0.8) * 0.08;
      }
      if (glow) {
        const gs = 1 + Math.sin(t * 1.8 + i * 0.5) * 0.3;
        glow.scale.setScalar(gs);
        (glow.material as THREE.MeshBasicMaterial).opacity =
          0.06 + Math.sin(t * 2.5 + i * 0.6) * 0.04;
      }
    });
  });

  return (
    <group>
      {NEURAL_NODES.map((node, i) => {
        const pos = positions[i];
        const col = new THREE.Color(node.color);
        return (
          <group key={node.id} position={[pos.x, pos.y, pos.z]}>
            {/* Glow sphere (larger, transparent) */}
            <mesh ref={el => { glowRefs.current[i] = el; }}>
              <sphereGeometry args={[node.size * 3, 16, 16]} />
              <meshBasicMaterial
                color={col}
                transparent
                opacity={0.06}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            {/* Main node sphere */}
            <mesh ref={el => { meshRefs.current[i] = el; }}>
              <sphereGeometry args={[node.size, 24, 24]} />
              <meshStandardMaterial
                color={col}
                emissive={col}
                emissiveIntensity={0.7}
                transparent
                opacity={0.95}
                roughness={0.15}
                metalness={0.3}
              />
            </mesh>
            {/* Orbital ring */}
            <mesh ref={el => { ringRefs.current[i] = el; }}>
              <torusGeometry args={[node.size * 2, 0.018, 8, 40]} />
              <meshBasicMaterial color={col} transparent opacity={0.18} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
            {showLabels && (
              <Billboard follow lockX={false} lockY={false} lockZ={false}>
                <Text
                  position={[0, node.size + 0.5, 0]}
                  fontSize={0.28}
                  color={node.color}
                  anchorX="center"
                  anchorY="bottom"
                  outlineWidth={0.025}
                  outlineColor="#000000"
                >
                  {node.label}
                </Text>
                <Text
                  position={[0, node.size + 0.15, 0]}
                  fontSize={0.17}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="bottom"
                  outlineWidth={0.012}
                  outlineColor="#000000"
                  fillOpacity={0.5}
                >
                  {node.arch}
                </Text>
              </Billboard>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ─── Flow beams (HD — more, faster, brighter) ───
function FlowBeams({ paused }: { paused: boolean }) {
  const positions = useMemo(computeGlobePositions, []);
  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    NEURAL_NODES.forEach((n, i) => map.set(n.id, i));
    return map;
  }, []);

  const validConns = useMemo(() => {
    return CONNECTIONS.map(([fromId, toId]) => {
      const fi = nodeIndexMap.get(fromId);
      const ti = nodeIndexMap.get(toId);
      if (fi === undefined || ti === undefined) return null;
      return { from: positions[fi], to: positions[ti], color: NEURAL_NODES[fi].color };
    }).filter(Boolean) as { from: THREE.Vector3; to: THREE.Vector3; color: string }[];
  }, [positions, nodeIndexMap]);

  const beamsRef = useRef<THREE.Group>(null);
  const beamState = useRef(
    Array.from({ length: NUM_FLOW_BEAMS }, () => ({
      progress: Math.random(),
      connIdx: Math.floor(Math.random() * Math.max(1, CONNECTIONS.length)),
      speed: 0.2 + Math.random() * 0.5,
    }))
  );

  useFrame((_, delta) => {
    if (paused || !beamsRef.current || validConns.length === 0) return;
    beamState.current.forEach((b, i) => {
      b.progress += b.speed * delta;
      if (b.progress > 1) {
        b.progress = 0;
        b.connIdx = Math.floor(Math.random() * validConns.length);
        b.speed = 0.2 + Math.random() * 0.5;
      }
      const conn = validConns[b.connIdx % validConns.length];
      if (!conn) return;
      const child = beamsRef.current!.children[i] as THREE.Mesh;
      if (!child) return;
      const mid = new THREE.Vector3().addVectors(conn.from, conn.to).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(GLOBE_RADIUS * 1.14);
      const t = b.progress;
      const pos = new THREE.Vector3()
        .copy(conn.from).multiplyScalar((1 - t) * (1 - t))
        .add(mid.clone().multiplyScalar(2 * (1 - t) * t))
        .add(conn.to.clone().multiplyScalar(t * t));
      child.position.copy(pos);
      const scale = Math.sin(t * Math.PI) * 0.14 + 0.05;
      child.scale.setScalar(scale);
      (child.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.9;
    });
  });

  return (
    <group ref={beamsRef}>
      {beamState.current.map((b, i) => {
        const conn = validConns[b.connIdx % validConns.length];
        return (
          <mesh key={i}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              color={conn?.color || "#ffffff"}
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Cosmic particles (HD — more, varied sizes) ───
function CosmicParticles({ paused }: { paused: boolean }) {
  const geo = useMemo(() => {
    const positions = new Float32Array(NUM_PARTICLES * 3);
    const colors = new Float32Array(NUM_PARTICLES * 3);
    const palette = ["#00e5ff", "#69f0ae", "#ffd740", "#ff80ab", "#b388ff", "#ea80fc", "#18ffff", "#7c4dff", "#c084fc", "#84ffff"];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const r = GLOBE_RADIUS * (0.5 + Math.random() * 0.9);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  const basePos = useRef<Float32Array | null>(null);
  useEffect(() => {
    basePos.current = new Float32Array(geo.attributes.position.array);
  }, [geo]);

  useFrame(({ clock }) => {
    if (paused || !basePos.current) return;
    const t = clock.elapsedTime;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < NUM_PARTICLES; i++) {
      pos[i * 3] = basePos.current[i * 3] + Math.sin(t * 0.25 + i * 0.04) * 0.15;
      pos[i * 3 + 1] = basePos.current[i * 3 + 1] + Math.cos(t * 0.2 + i * 0.06) * 0.15;
      pos[i * 3 + 2] = basePos.current[i * 3 + 2] + Math.sin(t * 0.15 + i * 0.02) * 0.1;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial
        size={0.055}
        transparent
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0.5}
      />
    </points>
  );
}

// ─── Globe rotation ───
function GlobeRotation({ paused, children }: { paused: boolean; children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!paused && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.055;
    }
  });
  return <group ref={groupRef}>{children}</group>;
}

// ─── Scene ───
function NeuralScene({ paused, showLabels }: { paused: boolean; showLabels: boolean }) {
  return (
    <>
      <color attach="background" args={["#020810"]} />
      <fogExp2 attach="fog" args={["#020810", 0.01]} />
      <EnergyCore paused={paused} />
      <GlobeRotation paused={paused}>
        <GlobeWireframe />
        <ConnectionCurves paused={paused} />
        <GlobeNodes paused={paused} showLabels={showLabels} />
        <FlowBeams paused={paused} />
      </GlobeRotation>
      <CosmicParticles paused={paused} />
      <ambientLight intensity={0.04} />
      <pointLight position={[0, 20, 25]} intensity={1.2} color="#4488ff" distance={70} />
      <pointLight position={[-20, -10, 15]} intensity={0.7} color="#ff80ab" distance={50} />
      <pointLight position={[20, 10, -15]} intensity={0.7} color="#69f0ae" distance={50} />
      <pointLight position={[0, 0, 0]} intensity={0.6} color="#00e5ff" distance={25} />
      <pointLight position={[0, -15, 0]} intensity={0.3} color="#b388ff" distance={30} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={14}
        maxDistance={65}
        autoRotate={!paused}
        autoRotateSpeed={0.12}
        enablePan
      />
    </>
  );
}

// ─── HUD Badge ───
function HudBadge({ icon, label, value, color, pulse }: {
  icon: React.ReactNode; label: string; value: string; color: string; pulse?: boolean;
}) {
  return (
    <div className="bg-black/80 backdrop-blur-md rounded-md px-2.5 py-1 border border-white/[0.08] flex items-center gap-1.5"
      style={{ boxShadow: `0 0 12px ${color}15` }}>
      <span style={{ color }} className={pulse ? "animate-pulse" : ""}>{icon}</span>
      <span className="text-[7px] text-white/30 font-mono tracking-[0.15em] uppercase">{label}</span>
      <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Metrics Overlay ───
function MetricsOverlay() {
  const [m, setM] = useState({
    qps: 0, cache: 0, experts: 0, latency: 0, tokens: 0,
    phi: 0, ble: 0, mqtt: false, threats: 0, blocked: 0,
  });

  useEffect(() => {
    let mounted = true;
    const fetchRealMetrics = async () => {
      try {
        const [knowledgeRes] = await Promise.all([
          supabase.from("neural_knowledge_base" as any).select("id", { count: "exact", head: true }),
        ]);
        if (mounted) setM(prev => ({ ...prev, tokens: (knowledgeRes.count ?? 0) * 512 }));
      } catch {}
    };
    fetchRealMetrics();

    const iv = setInterval(() => {
      if (!mounted) return;
      const defense = getDefenseMetrics();
      setM(prev => ({
        ...prev,
        qps: Math.floor(18 + Math.random() * 28),
        cache: Math.round((0.65 + Math.random() * 0.3) * 100),
        experts: Math.floor(4 + Math.random() * 4),
        latency: Math.floor(12 + Math.random() * 120),
        phi: +(0.3 + Math.random() * 0.5).toFixed(2),
        ble: Math.floor(Math.random() * 3),
        mqtt: Math.random() > 0.15,
        threats: defense.totalThreats,
        blocked: defense.blocked,
      }));
    }, 2500);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  return (
    <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-1.5">
      {/* Title */}
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: "0 0 8px #00e5ff" }} />
        <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-cyan-300/60">ORION NEUROCORE</span>
        <span className="text-[8px] font-mono text-white/20">v23.1</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        <HudBadge icon={<Zap className="h-3 w-3" />} label="QPS" value={`${m.qps}`} color="#00e5ff" />
        <HudBadge icon={<Database className="h-3 w-3" />} label="CACHE" value={`${m.cache}%`} color="#ffd740" />
        <HudBadge icon={<Cpu className="h-3 w-3" />} label="EXPERTS" value={`${m.experts}/8`} color="#69f0ae" />
        <HudBadge icon={<Activity className="h-3 w-3" />} label="LAT" value={`${m.latency}ms`} color="#b388ff" />
      </div>
      <div className="flex gap-1 flex-wrap">
        <HudBadge icon={<Brain className="h-3 w-3" />} label="NODES" value={`${NEURAL_NODES.length}`} color="#ff80ab" />
        <HudBadge icon={<Shield className="h-3 w-3" />} label="Φ" value={`${m.phi}`} color="#c084fc" pulse />
        <HudBadge icon={<Bluetooth className="h-3 w-3" />} label="BLE" value={`${m.ble}`} color="#60a5fa" />
        <HudBadge icon={<Wifi className="h-3 w-3" />} label="MQTT" value={m.mqtt ? "ON" : "—"} color={m.mqtt ? "#34d399" : "#ef4444"} />
      </div>
      <div className="flex gap-1 flex-wrap">
        <HudBadge icon={<Lock className="h-3 w-3" />} label="THREATS" value={`${m.threats}`} color={m.threats > 0 ? "#ff1744" : "#34d399"} pulse={m.threats > 0} />
        <HudBadge icon={<Eye className="h-3 w-3" />} label="BLOCKED" value={`${m.blocked}`} color="#ff1744" />
        <HudBadge icon={<Layers className="h-3 w-3" />} label="CONNS" value={`${CONNECTIONS.length}`} color="#7c4dff" />
        <HudBadge icon={<Radio className="h-3 w-3" />} label="PARTICLES" value={`${NUM_PARTICLES.toLocaleString()}`} color="#84ffff" />
      </div>
    </div>
  );
}

// ─── Category Legend ───
const CATEGORIES = [
  { label: "Core LLM/RAG (Transformer+AN)", color: "#00e5ff" },
  { label: "Expert Models (MoE)", color: "#69f0ae" },
  { label: "Vision (CNN+DCIGN)", color: "#ea80fc" },
  { label: "Cognição (GWT+LSM+GNN)", color: "#ff80ab" },
  { label: "Memória (Hopfield+AE+LSTM)", color: "#ffd740" },
  { label: "Ação (SSM+BERT)", color: "#448aff" },
  { label: "Defesa (GAN+QNN+RBM)", color: "#ff1744" },
  { label: "I/O (RNN+CNN)", color: "#18ffff" },
  { label: "Federação (P2P+Federated)", color: "#7c4dff" },
  { label: "Search/Data (APIs)", color: "#ffab40" },
];

function CategoryLegend() {
  return (
    <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md rounded-lg p-2.5 border border-white/[0.08] z-10 pointer-events-none max-w-[560px]"
      style={{ boxShadow: "0 0 20px rgba(0,229,255,0.05)" }}>
      <p className="text-[8px] text-cyan-400/30 mb-2 font-mono tracking-[0.2em] uppercase">
        ORION NEUROCORE · {NEURAL_NODES.length} Nós · {CONNECTIONS.length} Sinapses · {NUM_PARTICLES.toLocaleString()} Partículas · Tensor 2^n
      </p>
      <div className="grid grid-cols-5 gap-x-3 gap-y-1">
        {CATEGORIES.map((cat, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}60` }}
            />
            <span className="text-[7px] text-white/40 font-mono truncate">{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───
export function NeuralNetworkLiveView() {
  const [paused, setPaused] = useState(false);
  const [key, setKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  return (
    <Card className="border-cyan-500/10 bg-[#020810] overflow-hidden shadow-2xl" style={{ boxShadow: "0 0 40px rgba(0,229,255,0.06)" }}>
      <CardContent className="p-0">
        <div className="relative" style={{ height: expanded ? "90vh" : "600px", transition: "height 0.4s cubic-bezier(.4,0,.2,1)" }}>
          <MetricsOverlay />

          {/* Status badge */}
          <div className="absolute top-3 right-14 z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md rounded-md px-3 py-1.5 border border-white/[0.08]"
              style={{ boxShadow: paused ? "0 0 10px rgba(245,158,11,0.15)" : "0 0 10px rgba(52,211,153,0.15)" }}>
              <div className={`h-2 w-2 rounded-full ${paused ? "bg-amber-500" : "bg-emerald-400 animate-pulse"}`}
                style={{ boxShadow: paused ? "0 0 6px #f59e0b" : "0 0 6px #34d399" }} />
              <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: paused ? "#f59e0b" : "#34d399" }}>
                {paused ? "PAUSED" : "LIVE"}
              </span>
            </div>
          </div>

          <Canvas
            key={key}
            camera={{ position: [0, 6, 30], fov: 48 }}
            gl={{
              antialias: true,
              alpha: false,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.3,
              powerPreference: "high-performance",
            }}
            dpr={[1, 2]}
            onCreated={({ gl }) => { gl.setClearColor("#020810"); }}
          >
            <NeuralScene paused={paused} showLabels={showLabels} />
          </Canvas>

          <CategoryLegend />

          {/* Scanline */}
          <div className="absolute inset-0 pointer-events-none z-[5] opacity-[0.008]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.04) 2px, rgba(0,229,255,0.04) 3px)" }} />
          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none z-[5]"
            style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,8,16,0.97) 100%)" }} />
          {/* Top edge glow */}
          <div className="absolute top-0 left-0 right-0 h-px z-[6]"
            style={{ background: "linear-gradient(90deg, transparent 10%, rgba(0,229,255,0.3) 50%, transparent 90%)" }} />

          {/* Controls */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-black/80 border-white/[0.1] text-white/40 hover:text-cyan-400 hover:border-cyan-500/30 backdrop-blur-md transition-all"
              onClick={() => setShowLabels(!showLabels)}
              title={showLabels ? "Ocultar nomes" : "Mostrar nomes"}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-black/80 border-white/[0.1] text-white/40 hover:text-cyan-400 hover:border-cyan-500/30 backdrop-blur-md transition-all"
              onClick={() => setExpanded(!expanded)}>
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-black/80 border-white/[0.1] text-white/40 hover:text-cyan-400 hover:border-cyan-500/30 backdrop-blur-md transition-all"
              onClick={() => setPaused(!paused)}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-black/80 border-white/[0.1] text-white/40 hover:text-cyan-400 hover:border-cyan-500/30 backdrop-blur-md transition-all"
              onClick={() => setKey(k => k + 1)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
