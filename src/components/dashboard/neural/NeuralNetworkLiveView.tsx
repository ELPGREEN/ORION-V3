import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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

// ─── ORION BRAIN ARCHITECTURE ───
const NEURAL_NODES = [
  { id: "llm_core", label: "LLM Core", category: "core", color: "#00e5ff", size: 0.35, arch: "Transformer" },
  { id: "rag_engine", label: "RAG Engine", category: "core", color: "#00e5ff", size: 0.3, arch: "FFN+Retrieval" },
  { id: "kv_cache", label: "KV Cache", category: "core", color: "#ffd740", size: 0.25, arch: "NTM Memory" },
  { id: "slim_router", label: "SlimRouter", category: "core", color: "#b388ff", size: 0.28, arch: "Perceptron" },
  { id: "som_router", label: "SOM Router", category: "core", color: "#b388ff", size: 0.22, arch: "Kohonen SOM" },
  { id: "mha", label: "MHA 7-Head", category: "core", color: "#00e5ff", size: 0.26, arch: "Attention" },
  { id: "moe_gate", label: "MoE Gate", category: "experts", color: "#69f0ae", size: 0.25, arch: "Gated MoE" },
  { id: "deepseek", label: "DeepSeek Δ", category: "experts", color: "#69f0ae", size: 0.22, arch: "DRN" },
  { id: "groq", label: "Groq Alpha", category: "experts", color: "#69f0ae", size: 0.22, arch: "Transformer" },
  { id: "gemini", label: "Gemini Beta", category: "experts", color: "#69f0ae", size: 0.22, arch: "Transformer" },
  { id: "mistral", label: "Mistral Gamma", category: "experts", color: "#69f0ae", size: 0.22, arch: "Transformer" },
  { id: "openrouter", label: "OpenRouter ε", category: "experts", color: "#69f0ae", size: 0.2, arch: "Router FFN" },
  { id: "huggingface", label: "HuggingFace", category: "experts", color: "#69f0ae", size: 0.2, arch: "Inference API" },
  { id: "vlm", label: "VLM", category: "vision", color: "#ea80fc", size: 0.25, arch: "DCIGN" },
  { id: "sam", label: "SAM", category: "vision", color: "#84ffff", size: 0.22, arch: "CNN+Decoder" },
  { id: "yolo", label: "YOLOv8", category: "vision", color: "#ea80fc", size: 0.22, arch: "CNN" },
  { id: "mediapipe", label: "MediaPipe", category: "vision", color: "#ea80fc", size: 0.2, arch: "CNN+BlazeNet" },
  { id: "ocr", label: "OCR Engine", category: "vision", color: "#84ffff", size: 0.2, arch: "CNN+RNN" },
  { id: "clip", label: "CLIP Cross-Modal", category: "vision", color: "#ea80fc", size: 0.2, arch: "Contrastive" },
  { id: "cognition", label: "Cognição", category: "cognition", color: "#ff80ab", size: 0.28, arch: "GWT" },
  { id: "tom", label: "Teoria da Mente", category: "cognition", color: "#ff80ab", size: 0.22, arch: "RNN" },
  { id: "causal", label: "Raciocínio Causal", category: "cognition", color: "#ff80ab", size: 0.22, arch: "GNN" },
  { id: "metacog", label: "Meta-Cognição", category: "cognition", color: "#ff80ab", size: 0.22, arch: "DNC" },
  { id: "somatic", label: "Marcadores Somáticos", category: "cognition", color: "#ff80ab", size: 0.2, arch: "ESN" },
  { id: "stdp", label: "STDP Gamma", category: "cognition", color: "#ff80ab", size: 0.2, arch: "LSM" },
  { id: "pgvector", label: "pgVector", category: "memory", color: "#ffd740", size: 0.25, arch: "FAISS/IVF" },
  { id: "embeddings", label: "Embeddings", category: "memory", color: "#ffd740", size: 0.22, arch: "AE 768d" },
  { id: "episodic", label: "Memória Episódica", category: "memory", color: "#ffd740", size: 0.22, arch: "LSTM" },
  { id: "knowledge", label: "Knowledge Base", category: "memory", color: "#ffd740", size: 0.2, arch: "DBN" },
  { id: "hopfield", label: "Hopfield Net", category: "memory", color: "#ffd740", size: 0.2, arch: "Hopfield" },
  { id: "lam", label: "LAM", category: "action", color: "#ccff90", size: 0.25, arch: "Transformer" },
  { id: "mamba", label: "Mamba SSM", category: "action", color: "#448aff", size: 0.25, arch: "SSM O(n)" },
  { id: "mlm", label: "MLM Masked", category: "action", color: "#ff5252", size: 0.22, arch: "BERT-like" },
  { id: "defense", label: "Orion Shield", category: "defense", color: "#ff1744", size: 0.28, arch: "GAN Guard" },
  { id: "llm_judge", label: "LLM Judge", category: "defense", color: "#ffab40", size: 0.22, arch: "Critic Net" },
  { id: "quantum_psi", label: "Ψ Tensor", category: "defense", color: "#c084fc", size: 0.25, arch: "TNN/RBM" },
  { id: "active_inf", label: "Active Inference", category: "defense", color: "#ff1744", size: 0.2, arch: "VAE" },
  { id: "wta", label: "WTA Competitive", category: "defense", color: "#ffab40", size: 0.18, arch: "Kohonen" },
  { id: "input_text", label: "Texto", category: "io", color: "#18ffff", size: 0.2, arch: "Tokenizer" },
  { id: "input_voice", label: "Voz", category: "io", color: "#18ffff", size: 0.2, arch: "RNN/CTC" },
  { id: "input_vision", label: "Visão", category: "io", color: "#18ffff", size: 0.2, arch: "CNN" },
  { id: "output", label: "Output", category: "io", color: "#18ffff", size: 0.25, arch: "Decoder" },
  { id: "iot_ble", label: "IoT/BLE", category: "io", color: "#60a5fa", size: 0.18, arch: "MQTT" },
  { id: "mqtt", label: "MQTT", category: "io", color: "#60a5fa", size: 0.18, arch: "PubSub" },
  { id: "digital_twin", label: "Digital Twin", category: "federation", color: "#7c4dff", size: 0.22, arch: "GAN Mirror" },
  { id: "a2a", label: "A2A Protocol", category: "federation", color: "#7c4dff", size: 0.2, arch: "P2P" },
  { id: "mcp", label: "MCP Bridge", category: "federation", color: "#7c4dff", size: 0.2, arch: "RPC" },
  { id: "child_net", label: "Child Network", category: "federation", color: "#7c4dff", size: 0.18, arch: "Federated" },
  { id: "firecrawl", label: "Firecrawl", category: "search", color: "#ffab40", size: 0.18, arch: "Crawler" },
  { id: "searxng", label: "SearXNG", category: "search", color: "#ffab40", size: 0.18, arch: "Meta-Search" },
  { id: "datajud", label: "DataJud", category: "search", color: "#ffab40", size: 0.18, arch: "API Legal" },
  { id: "lexml", label: "LexML", category: "search", color: "#ffab40", size: 0.18, arch: "API Legal" },
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
const NUM_IMPULSES = 150;
const NUM_CSF_PARTICLES = 4000;

// ─── Fibonacci sphere positioning ───
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

// Dendrites removed — clean modern HD style

// ─── Organic Neuron Bodies with Dendrites ───
function NeuronBodies({ paused, showLabels }: { paused: boolean; showLabels: boolean }) {
  const positions = useMemo(computeGlobePositions, []);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dendriteRefs = useRef<(THREE.LineSegments | null)[]>([]);

  // Canvas label textures
  const labelTextures = useMemo(() => {
    return NEURAL_NODES.map((node) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 144;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.clearRect(0, 0, 512, 144);
      ctx.beginPath();
      ctx.roundRect(16, 14, 480, 116, 16);
      ctx.fillStyle = "rgba(2, 8, 20, 0.88)";
      ctx.fill();
      ctx.strokeStyle = node.color + "40";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(80, 16);
      ctx.lineTo(432, 16);
      ctx.strokeStyle = node.color + "60";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowBlur = 12;
      ctx.shadowColor = node.color;
      ctx.fillStyle = node.color;
      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
      ctx.fillText(node.label, 256, 56);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = '500 20px ui-monospace, monospace';
      ctx.fillText(node.arch, 256, 100);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    });
  }, []);

  useEffect(() => {
    return () => { labelTextures.forEach((t) => t?.dispose()); };
  }, [labelTextures]);

  // Perturbed geometries for organic look — one per node size
  const geoCache = useMemo(() => {
    const cache = new Map<number, THREE.IcosahedronGeometry>();
    const sizes = new Set(NEURAL_NODES.map(n => n.size));
    sizes.forEach(s => {
      const geo = new THREE.IcosahedronGeometry(s, 3);
      const posAttr = geo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        const noise = 1 + (Math.sin(x * 15 + y * 7) * Math.cos(z * 11 + x * 3)) * 0.15;
        posAttr.setXYZ(i, x * noise, y * noise, z * noise);
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
      cache.set(s, geo);
    });
    return cache;
  }, []);

  // Dendrite geometries
  const dendriteGeos = useMemo(() => {
    return NEURAL_NODES.map((node, i) =>
      generateDendrites(positions[i], node.size, 4 + (i % 3), i)
    );
  }, [positions]);

  useFrame(({ clock }) => {
    if (paused) return;
    const t = clock.elapsedTime;
    NEURAL_NODES.forEach((_, i) => {
      const mesh = meshRefs.current[i];
      if (mesh) {
        const pulse = 1 + Math.sin(t * 1.8 + i * 0.7) * 0.08;
        mesh.scale.setScalar(pulse);
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        mat.emissiveIntensity = 0.4 + Math.sin(t * 2.5 + i * 0.5) * 0.3;
      }
      const dendrite = dendriteRefs.current[i];
      if (dendrite) {
        const mat = dendrite.material as THREE.LineBasicMaterial;
        mat.opacity = 0.15 + Math.sin(t * 1.2 + i * 0.3) * 0.08;
      }
    });
  });

  return (
    <group>
      {NEURAL_NODES.map((node, i) => {
        const pos = positions[i];
        const col = new THREE.Color(node.color);
        const tex = labelTextures[i];
        const geo = geoCache.get(node.size);
        return (
          <group key={node.id} position={[pos.x, pos.y, pos.z]}>
            {/* Organic cell body — translucent bio-luminescent */}
            <mesh ref={el => { meshRefs.current[i] = el; }} geometry={geo}>
              <meshPhysicalMaterial
                color={col}
                emissive={col}
                emissiveIntensity={0.4}
                transparent
                opacity={0.7}
                roughness={0.6}
                metalness={0.0}
                transmission={0.3}
                thickness={0.8}
                ior={1.4}
                clearcoat={0.3}
                clearcoatRoughness={0.4}
              />
            </mesh>
            {/* Nucleus glow */}
            <mesh>
              <sphereGeometry args={[node.size * 0.4, 8, 8]} />
              <meshBasicMaterial
                color={col}
                transparent
                opacity={0.9}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {/* Dendrites — thin organic branches */}
            <lineSegments
              ref={el => { dendriteRefs.current[i] = el; }}
              geometry={dendriteGeos[i]}
            >
              <lineBasicMaterial
                color={col}
                transparent
                opacity={0.18}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </lineSegments>
            {/* Label */}
            {showLabels && tex && (
              <sprite position={[0, node.size + 0.9, 0]} scale={[3.6, 1.0, 1]}>
                <spriteMaterial map={tex} transparent opacity={0.92} depthWrite={false} depthTest={false} />
              </sprite>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ─── Axon Tubes — 3D tubular connections like real nerve fibers ───
function AxonTubes({ paused }: { paused: boolean }) {
  const positions = useMemo(computeGlobePositions, []);
  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    NEURAL_NODES.forEach((n, i) => map.set(n.id, i));
    return map;
  }, []);

  const tubeData = useMemo(() => {
    return CONNECTIONS.map(([fromId, toId]) => {
      const fi = nodeIndexMap.get(fromId);
      const ti = nodeIndexMap.get(toId);
      if (fi === undefined || ti === undefined) return null;
      const from = positions[fi];
      const to = positions[ti];
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const outwardFactor = 1.15 + mid.length() * 0.015;
      mid.normalize().multiplyScalar(from.length() * outwardFactor);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.025, 6, false);
      return { geo: tubeGeo, color: NEURAL_NODES[fi].color, idx: fi };
    }).filter(Boolean) as { geo: THREE.TubeGeometry; color: string; idx: number }[];
  }, [positions, nodeIndexMap]);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    if (paused) return;
    const t = clock.elapsedTime;
    tubeData.forEach((_, i) => {
      const mesh = meshRefs.current[i];
      if (mesh) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.12 + Math.sin(t * 1.5 + i * 0.15) * 0.08;
      }
    });
  });

  return (
    <group>
      {tubeData.map((tube, i) => (
        <mesh key={i} ref={el => { meshRefs.current[i] = el; }} geometry={tube.geo}>
          <meshBasicMaterial
            color={tube.color}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Synaptic Impulses — bright electrical sparks traveling along axons ───
function SynapticImpulses({ paused }: { paused: boolean }) {
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
      const from = positions[fi];
      const to = positions[ti];
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(from.length() * 1.15);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      return { curve, color: NEURAL_NODES[fi].color };
    }).filter(Boolean) as { curve: THREE.QuadraticBezierCurve3; color: string }[];
  }, [positions, nodeIndexMap]);

  const groupRef = useRef<THREE.Group>(null);
  const impulseState = useRef(
    Array.from({ length: NUM_IMPULSES }, () => ({
      progress: Math.random(),
      connIdx: Math.floor(Math.random() * Math.max(1, CONNECTIONS.length)),
      speed: 0.2 + Math.random() * 0.5,
    }))
  );

  useFrame((_, delta) => {
    if (paused || !groupRef.current || validConns.length === 0) return;
    impulseState.current.forEach((b, i) => {
      b.progress += b.speed * delta;
      if (b.progress > 1) {
        b.progress = 0;
        b.connIdx = Math.floor(Math.random() * validConns.length);
        b.speed = 0.2 + Math.random() * 0.5;
      }
      const conn = validConns[b.connIdx % validConns.length];
      if (!conn) return;
      const child = groupRef.current!.children[i] as THREE.Mesh;
      if (!child) return;
      const pos = conn.curve.getPoint(b.progress);
      child.position.copy(pos);
      // Bright at center of travel, fade at endpoints
      const intensity = Math.sin(b.progress * Math.PI);
      const scale = 0.04 + intensity * 0.1;
      child.scale.setScalar(scale);
      (child.material as THREE.MeshBasicMaterial).opacity = intensity * 0.95;
    });
  });

  return (
    <group ref={groupRef}>
      {impulseState.current.map((b, i) => {
        const conn = validConns[b.connIdx % validConns.length];
        return (
          <mesh key={i}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial
              color={conn?.color || "#00e5ff"}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Cerebrospinal Fluid Particles — tiny slow ambient particles ───
function CSFParticles({ paused }: { paused: boolean }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(NUM_CSF_PARTICLES * 3);
    const cols = new Float32Array(NUM_CSF_PARTICLES * 3);
    for (let i = 0; i < NUM_CSF_PARTICLES; i++) {
      const r = GLOBE_RADIUS * (0.2 + Math.random() * 1.0);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      // Subtle neutral blue-white tones
      const brightness = 0.3 + Math.random() * 0.3;
      cols[i * 3] = brightness * 0.7;
      cols[i * 3 + 1] = brightness * 0.85;
      cols[i * 3 + 2] = brightness;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    return g;
  }, []);

  const basePos = useRef<Float32Array | null>(null);
  useEffect(() => {
    basePos.current = new Float32Array(geo.attributes.position.array);
  }, [geo]);

  useFrame(({ clock }) => {
    if (paused || !basePos.current) return;
    const t = clock.elapsedTime;
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < NUM_CSF_PARTICLES; i++) {
      arr[i * 3] = basePos.current[i * 3] + Math.sin(t * 0.08 + i * 0.01) * 0.06;
      arr[i * 3 + 1] = basePos.current[i * 3 + 1] + Math.cos(t * 0.06 + i * 0.02) * 0.06;
      arr[i * 3 + 2] = basePos.current[i * 3 + 2] + Math.sin(t * 0.05 + i * 0.008) * 0.04;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial
        size={0.025}
        transparent
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0.25}
      />
    </points>
  );
}

// ─── Central Brain Core — organic pulsing nucleus ───
function BrainCore({ paused }: { paused: boolean }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (paused) return;
    const t = clock.elapsedTime;
    if (coreRef.current) {
      const s = 1.5 + Math.sin(t * 1.2) * 0.2;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 2) * 0.08;
    }
    if (shellRef.current) {
      shellRef.current.rotation.y = t * 0.08;
      shellRef.current.rotation.x = t * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.2, 3]} />
        <meshBasicMaterial color="#4dc9f6" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[2.8, 1]} />
        <meshBasicMaterial color="#1a6b8a" transparent opacity={0.04} wireframe blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ─── Globe auto-rotation ───
function GlobeRotation({ paused, children }: { paused: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!paused && ref.current) ref.current.rotation.y += delta * 0.04;
  });
  return <group ref={ref}>{children}</group>;
}

// ─── Full Scene ───
function NeuralScene({ paused, showLabels }: { paused: boolean; showLabels: boolean }) {
  return (
    <>
      <color attach="background" args={["#010810"]} />
      <fogExp2 attach="fog" args={["#010810", 0.006]} />

      <BrainCore paused={paused} />

      <GlobeRotation paused={paused}>
        <AxonTubes paused={paused} />
        <NeuronBodies paused={paused} showLabels={showLabels} />
        <SynapticImpulses paused={paused} />
      </GlobeRotation>

      <CSFParticles paused={paused} />

      {/* Lighting — subtle biological tones */}
      <ambientLight intensity={0.02} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#4dc9f6" distance={25} />
      <pointLight position={[0, 20, 25]} intensity={1.0} color="#1a3a6b" distance={70} />
      <pointLight position={[-20, -10, 15]} intensity={0.4} color="#6b3a5a" distance={50} />
      <pointLight position={[20, 10, -15]} intensity={0.4} color="#3a6b4a" distance={50} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={14}
        maxDistance={60}
        autoRotate={!paused}
        autoRotateSpeed={0.08}
        enablePan
      />

      {/* Bloom post-processing — cinematic bioluminescence */}
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ─── HUD Badge ───
function HudBadge({ icon, label, value, color, pulse }: {
  icon: React.ReactNode; label: string; value: string; color: string; pulse?: boolean;
}) {
  return (
    <div className="bg-[#010810]/90 backdrop-blur-md rounded px-2 py-0.5 border border-white/[0.06] flex items-center gap-1.5"
      style={{ boxShadow: `0 0 8px ${color}10` }}>
      <span style={{ color }} className={pulse ? "animate-pulse" : ""}>{icon}</span>
      <span className="text-[7px] text-white/25 font-mono tracking-[0.15em] uppercase">{label}</span>
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
    supabase.from("neural_knowledge_base" as any).select("id", { count: "exact", head: true })
      .then(({ count }) => { if (mounted) setM(p => ({ ...p, tokens: (count ?? 0) * 512 })); });

    const iv = setInterval(() => {
      if (!mounted) return;
      const defense = getDefenseMetrics();
      setM(p => ({
        ...p,
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
    <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" style={{ boxShadow: "0 0 8px #00e5ff" }} />
        <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-cyan-300/50">ORION NEUROCORE</span>
        <span className="text-[8px] font-mono text-white/15">v23.1 · NEURAL</span>
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
        <HudBadge icon={<Layers className="h-3 w-3" />} label="SYNAPSES" value={`${CONNECTIONS.length}`} color="#7c4dff" />
        <HudBadge icon={<Radio className="h-3 w-3" />} label="IMPULSES" value={`${NUM_IMPULSES}`} color="#84ffff" />
      </div>
    </div>
  );
}

// ─── Category Legend ───
const CATEGORIES = [
  { label: "Core LLM/RAG", color: "#00e5ff" },
  { label: "Expert Models (MoE)", color: "#69f0ae" },
  { label: "Vision (CNN+DCIGN)", color: "#ea80fc" },
  { label: "Cognição (GWT+GNN)", color: "#ff80ab" },
  { label: "Memória (Hopfield+LSTM)", color: "#ffd740" },
  { label: "Ação (SSM+BERT)", color: "#448aff" },
  { label: "Defesa (GAN+TNN)", color: "#ff1744" },
  { label: "I/O (RNN+CNN)", color: "#18ffff" },
  { label: "Federação (P2P)", color: "#7c4dff" },
  { label: "Search/Data", color: "#ffab40" },
];

function CategoryLegend() {
  return (
    <div className="absolute bottom-3 left-3 bg-[#010810]/90 backdrop-blur-md rounded-lg p-2 border border-white/[0.06] z-10 pointer-events-none max-w-[560px]"
      style={{ boxShadow: "0 0 15px rgba(0,229,255,0.04)" }}>
      <p className="text-[8px] text-cyan-400/25 mb-1.5 font-mono tracking-[0.2em] uppercase">
        ORION NEURAL BRAIN · {NEURAL_NODES.length} Nós · {CONNECTIONS.length} Sinapses · Bio-Neural Network
      </p>
      <div className="grid grid-cols-5 gap-x-3 gap-y-0.5">
        {CATEGORIES.map((cat, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color, boxShadow: `0 0 6px ${cat.color}50` }} />
            <span className="text-[7px] text-white/35 font-mono truncate">{cat.label}</span>
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
    <Card className="border-cyan-500/10 bg-[#010810] overflow-hidden shadow-2xl" style={{ boxShadow: "0 0 40px rgba(0,229,255,0.05)" }}>
      <CardContent className="p-0">
        <div className="relative" style={{ height: expanded ? "90vh" : "650px", transition: "height 0.4s cubic-bezier(.4,0,.2,1)" }}>
          <MetricsOverlay />

          {/* Status badge */}
          <div className="absolute top-3 right-14 z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-[#010810]/90 backdrop-blur-md rounded px-3 py-1 border border-white/[0.06]"
              style={{ boxShadow: paused ? "0 0 8px rgba(245,158,11,0.1)" : "0 0 8px rgba(52,211,153,0.1)" }}>
              <div className={`h-2 w-2 rounded-full ${paused ? "bg-amber-500" : "bg-emerald-400 animate-pulse"}`}
                style={{ boxShadow: paused ? "0 0 5px #f59e0b" : "0 0 5px #34d399" }} />
              <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: paused ? "#f59e0b" : "#34d399" }}>
                {paused ? "PAUSED" : "LIVE"}
              </span>
            </div>
          </div>

          <Canvas
            key={key}
            camera={{ position: [0, 6, 28], fov: 50 }}
            gl={{
              antialias: true,
              alpha: false,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.4,
              powerPreference: "high-performance",
            }}
            dpr={[1, 1.5]}
            onCreated={({ gl }) => { gl.setClearColor("#010810"); }}
          >
            <NeuralScene paused={paused} showLabels={showLabels} />
          </Canvas>

          <CategoryLegend />

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none z-[5]"
            style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(1,8,16,0.95) 100%)" }} />
          {/* Top glow edge */}
          <div className="absolute top-0 left-0 right-0 h-px z-[6]"
            style={{ background: "linear-gradient(90deg, transparent 10%, rgba(0,229,255,0.25) 50%, transparent 90%)" }} />

          {/* Controls */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-[#010810]/90 border-white/[0.08] text-white/35 hover:text-cyan-400 hover:border-cyan-500/25 backdrop-blur-md"
              onClick={() => setShowLabels(!showLabels)}
              title={showLabels ? "Ocultar nomes" : "Mostrar nomes"}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-[#010810]/90 border-white/[0.08] text-white/35 hover:text-cyan-400 hover:border-cyan-500/25 backdrop-blur-md"
              onClick={() => setExpanded(!expanded)}>
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-[#010810]/90 border-white/[0.08] text-white/35 hover:text-cyan-400 hover:border-cyan-500/25 backdrop-blur-md"
              onClick={() => setPaused(!paused)}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-[#010810]/90 border-white/[0.08] text-white/35 hover:text-cyan-400 hover:border-cyan-500/25 backdrop-blur-md"
              onClick={() => setKey(k => k + 1)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
