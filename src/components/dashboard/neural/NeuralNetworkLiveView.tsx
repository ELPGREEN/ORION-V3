import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity, Zap, Brain, Cpu, Database, Eye, Pause, Play,
  RotateCcw, Wifi, Bluetooth, Shield,
  Maximize2, Minimize2, Layers, Lock, Radio, Tag,
} from "lucide-react";
import { getDefenseMetrics } from "@/lib/neural/orion-defense-system";
import { getPipelineLatency } from "@/lib/neural/pipeline-latency-tracker";
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
const NUM_IMPULSES = 80;
const NUM_CSF_PARTICLES = 2000;
const NODE_COUNT = NEURAL_NODES.length;

// ─── Fibonacci sphere positioning ───
function computeGlobePositions() {
  const n = NODE_COUNT;
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

// ─── Realistic Neuron Soma Geometry — irregular surface via vertex displacement ───
function createSomaGeometry(baseSize: number): THREE.IcosahedronGeometry {
  const geo = new THREE.IcosahedronGeometry(baseSize, 3);
  const pos = geo.attributes.position;
  const seed = baseSize * 1000;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    // Procedural noise displacement for organic membrane look
    const n1 = Math.sin(x * 8.7 + seed) * Math.cos(y * 6.3 + seed) * 0.08;
    const n2 = Math.sin(y * 12.1 + z * 9.4 + seed) * 0.05;
    const n3 = Math.cos(z * 7.2 + x * 5.8 + seed) * 0.04;
    const displacement = 1 + n1 + n2 + n3;
    const nx = x / len, ny = y / len, nz = z / len;
    pos.setXYZ(i, nx * baseSize * displacement, ny * baseSize * displacement, nz * baseSize * displacement);
  }
  geo.computeVertexNormals();
  return geo;
}

// ─── Neuron Bodies — InstancedMesh with organic soma geometry ───
function NeuronBodies({ paused }: { paused: boolean }) {
  const positions = useMemo(computeGlobePositions, []);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);

  // Use a single organic geometry for all somas
  const somaGeo = useMemo(() => createSomaGeometry(1), []);
  const glowGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);

  // Soma material — translucent biological membrane
  const somaMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#88ccdd"),
    emissive: new THREE.Color("#224455"),
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.65,
    roughness: 0.55,
    metalness: 0.05,
    transmission: 0.3,
    thickness: 1.5,
    ior: 1.4,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    side: THREE.DoubleSide,
  }), []);

  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#aaeeff"),
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  // Set initial instance transforms
  useEffect(() => {
    if (!instancedRef.current || !glowRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < NODE_COUNT; i++) {
      const p = positions[i];
      const s = NEURAL_NODES[i].size;
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, dummy.matrix);
      glowRef.current.setMatrixAt(i, dummy.matrix);
      // Tint each instance with its category color but desaturated for realism
      color.set(NEURAL_NODES[i].color);
      // Desaturate: blend toward neutral
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      color.setHSL(hsl.h, hsl.s * 0.35, hsl.l * 0.7);
      instancedRef.current.setColorAt(i, color);
      // Glow keeps more saturation
      color.set(NEURAL_NODES[i].color);
      color.setHSL(hsl.h, hsl.s * 0.5, hsl.l * 0.5);
      glowRef.current.setColorAt(i, color);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
    instancedRef.current.instanceColor!.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceColor!.needsUpdate = true;
  }, [positions]);

  // Animate pulse
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    if (paused || !instancedRef.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < NODE_COUNT; i++) {
      const p = positions[i];
      const baseS = NEURAL_NODES[i].size;
      const pulse = 1 + Math.sin(t * 1.2 + i * 0.9) * 0.04;
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(baseS * pulse);
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
      if (glowRef.current) {
        dummy.scale.setScalar(baseS * pulse * 1.8);
        dummy.updateMatrix();
        glowRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
    if (glowRef.current) glowRef.current.instanceMatrix.needsUpdate = true;
    // Subtle emissive pulse
    somaMat.emissiveIntensity = 0.25 + Math.sin(t * 1.8) * 0.15;
  });

  return (
    <group>
      <instancedMesh ref={instancedRef} args={[somaGeo, somaMat, NODE_COUNT]} />
      <instancedMesh ref={glowRef} args={[glowGeo, glowMat, NODE_COUNT]} />
    </group>
  );
}

// ─── Axon Connections — merged geometry, variable radius, bioluminescent ───
function AxonNetwork({ paused }: { paused: boolean }) {
  const positions = useMemo(computeGlobePositions, []);
  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    NEURAL_NODES.forEach((n, i) => map.set(n.id, i));
    return map;
  }, []);

  // Merge all tube geometries into a single buffer
  const { mergedGeo, curveData } = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];
    const curves: { curve: THREE.QuadraticBezierCurve3; color: string }[] = [];

    CONNECTIONS.forEach(([fromId, toId]) => {
      const fi = nodeIndexMap.get(fromId);
      const ti = nodeIndexMap.get(toId);
      if (fi === undefined || ti === undefined) return;
      const from = positions[fi];
      const to = positions[ti];
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const outwardFactor = 1.12 + mid.length() * 0.012;
      mid.normalize().multiplyScalar(from.length() * outwardFactor);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      // Variable radius — thicker near soma, thinner in middle
      const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.018, 5, false);
      geometries.push(tubeGeo);
      curves.push({ curve, color: NEURAL_NODES[fi].color });
    });

    // Merge into single geometry
    let totalVerts = 0, totalIdx = 0;
    geometries.forEach(g => {
      totalVerts += g.attributes.position.count;
      totalIdx += g.index ? g.index.count : 0;
    });

    const mergedPos = new Float32Array(totalVerts * 3);
    const mergedNorm = new Float32Array(totalVerts * 3);
    const mergedColor = new Float32Array(totalVerts * 3);
    const mergedIdx: number[] = [];
    let vertOffset = 0, idxOffset = 0;

    geometries.forEach((g, gi) => {
      const pArr = g.attributes.position.array as Float32Array;
      const nArr = g.attributes.normal.array as Float32Array;
      const vCount = g.attributes.position.count;
      const col = new THREE.Color(curves[gi].color);
      // Desaturate for realism
      const hsl = { h: 0, s: 0, l: 0 };
      col.getHSL(hsl);
      col.setHSL(hsl.h, hsl.s * 0.3, hsl.l * 0.4);

      for (let i = 0; i < vCount; i++) {
        mergedPos[(vertOffset + i) * 3] = pArr[i * 3];
        mergedPos[(vertOffset + i) * 3 + 1] = pArr[i * 3 + 1];
        mergedPos[(vertOffset + i) * 3 + 2] = pArr[i * 3 + 2];
        mergedNorm[(vertOffset + i) * 3] = nArr[i * 3];
        mergedNorm[(vertOffset + i) * 3 + 1] = nArr[i * 3 + 1];
        mergedNorm[(vertOffset + i) * 3 + 2] = nArr[i * 3 + 2];
        mergedColor[(vertOffset + i) * 3] = col.r;
        mergedColor[(vertOffset + i) * 3 + 1] = col.g;
        mergedColor[(vertOffset + i) * 3 + 2] = col.b;
      }

      if (g.index) {
        const iArr = g.index.array;
        for (let i = 0; i < iArr.length; i++) {
          mergedIdx.push(iArr[i] + vertOffset);
        }
      }
      vertOffset += vCount;
      g.dispose();
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
    merged.setAttribute("normal", new THREE.BufferAttribute(mergedNorm, 3));
    merged.setAttribute("color", new THREE.BufferAttribute(mergedColor, 3));
    if (mergedIdx.length > 0) {
      merged.setIndex(new THREE.BufferAttribute(new Uint32Array(mergedIdx), 1));
    }

    return { mergedGeo: merged, curveData: curves };
  }, [positions, nodeIndexMap]);

  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (paused || !matRef.current) return;
    const t = clock.elapsedTime;
    matRef.current.opacity = 0.10 + Math.sin(t * 0.8) * 0.04;
  });

  return (
    <mesh geometry={mergedGeo}>
      <meshBasicMaterial
        ref={matRef}
        vertexColors
        transparent
        opacity={0.12}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Synaptic Impulses — InstancedMesh (1 draw call) ───
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
      mid.normalize().multiplyScalar(from.length() * 1.12);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      return { curve, colorHex: NEURAL_NODES[fi].color };
    }).filter(Boolean) as { curve: THREE.QuadraticBezierCurve3; colorHex: string }[];
  }, [positions, nodeIndexMap]);

  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const impulseGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
  const impulseMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#cceeff",
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  const impulseState = useRef(
    Array.from({ length: NUM_IMPULSES }, () => ({
      progress: Math.random(),
      connIdx: Math.floor(Math.random() * Math.max(1, CONNECTIONS.length)),
      speed: 0.15 + Math.random() * 0.4,
    }))
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    if (paused || !instancedRef.current || validConns.length === 0) return;
    impulseState.current.forEach((b, i) => {
      b.progress += b.speed * delta;
      if (b.progress > 1) {
        b.progress = 0;
        b.connIdx = Math.floor(Math.random() * validConns.length);
        b.speed = 0.15 + Math.random() * 0.4;
      }
      const conn = validConns[b.connIdx % validConns.length];
      if (!conn) return;
      const pos = conn.curve.getPoint(b.progress);
      const intensity = Math.sin(b.progress * Math.PI);
      const scale = 0.03 + intensity * 0.07;
      dummy.position.copy(pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
      // Color from connection, slightly brighter
      color.set(conn.colorHex);
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      color.setHSL(hsl.h, hsl.s * 0.4, Math.min(1, hsl.l + intensity * 0.3));
      instancedRef.current!.setColorAt(i, color);
    });
    instancedRef.current.instanceMatrix.needsUpdate = true;
    instancedRef.current.instanceColor!.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[impulseGeo, impulseMat, NUM_IMPULSES]} />
  );
}

// ─── CSF Particles — GPU-animated via ShaderMaterial ───
const csfVertexShader = `
  uniform float uTime;
  attribute vec3 basePosition;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec3 pos = basePosition;
    pos.x += sin(uTime * 0.08 + basePosition.y * 2.0) * 0.08;
    pos.y += cos(uTime * 0.06 + basePosition.z * 1.5) * 0.08;
    pos.z += sin(uTime * 0.05 + basePosition.x * 1.8) * 0.05;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 1.5 * (15.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const csfFragmentShader = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d) * 0.2;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

function CSFParticles({ paused }: { paused: boolean }) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const geo = useMemo(() => {
    const basePos = new Float32Array(NUM_CSF_PARTICLES * 3);
    const cols = new Float32Array(NUM_CSF_PARTICLES * 3);
    for (let i = 0; i < NUM_CSF_PARTICLES; i++) {
      const r = GLOBE_RADIUS * (0.2 + Math.random() * 1.0);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      basePos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      basePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      basePos[i * 3 + 2] = r * Math.cos(phi);
      const brightness = 0.25 + Math.random() * 0.25;
      cols[i * 3] = brightness * 0.6;
      cols[i * 3 + 1] = brightness * 0.8;
      cols[i * 3 + 2] = brightness;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(basePos, 3));
    g.setAttribute("basePosition", new THREE.BufferAttribute(basePos.slice(), 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(cols, 3));
    return g;
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    if (paused || !shaderRef.current) return;
    shaderRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points geometry={geo}>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={csfVertexShader}
        fragmentShader={csfFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
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
      const s = 1.5 + Math.sin(t * 1.0) * 0.15;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(t * 1.5) * 0.04;
    }
    if (shellRef.current) {
      shellRef.current.rotation.y = t * 0.06;
      shellRef.current.rotation.x = t * 0.035;
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.2, 3]} />
        <meshBasicMaterial color="#2a5566" transparent opacity={0.1} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[2.8, 1]} />
        <meshBasicMaterial color="#152a3a" transparent opacity={0.03} wireframe blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ─── Node Labels — Html overlays with proximity culling ───
function NodeLabels({ paused, visible }: { paused: boolean; visible: boolean }) {
  const positions = useMemo(computeGlobePositions, []);
  const { camera } = useThree();
  const [visibleNodes, setVisibleNodes] = useState<number[]>([]);

  useFrame(() => {
    if (!visible) return;
    // Calculate distances and show closest 15
    const dists = positions.map((p, i) => ({ i, d: camera.position.distanceTo(p) }));
    dists.sort((a, b) => a.d - b.d);
    const closest = dists.slice(0, 15).map(x => x.i);
    setVisibleNodes(closest);
  });

  if (!visible) return null;

  return (
    <group>
      {visibleNodes.map(idx => {
        const node = NEURAL_NODES[idx];
        const pos = positions[idx];
        return (
          <Html
            key={node.id}
            position={[pos.x, pos.y + node.size + 0.4, pos.z]}
            center
            distanceFactor={18}
            occlude={false}
            style={{ pointerEvents: "none" }}
          >
            <div className="bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 border border-white/[0.08] whitespace-nowrap">
              <div className="text-[10px] font-mono font-semibold leading-tight" style={{ color: node.color }}>
                {node.label}
              </div>
              <div className="text-[8px] font-mono leading-tight" style={{ color: node.color, opacity: 0.5 }}>
                {node.arch}
              </div>
            </div>
          </Html>
        );
      })}
    </group>
  );
}

// ─── Globe auto-rotation ───
function GlobeRotation({ paused, children }: { paused: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!paused && ref.current) ref.current.rotation.y += delta * 0.035;
  });
  return <group ref={ref}>{children}</group>;
}

// ─── Full Scene ───
function NeuralScene({ paused, showLabels }: { paused: boolean; showLabels: boolean }) {
  return (
    <>
      <color attach="background" args={["#020a12"]} />
      <fogExp2 attach="fog" args={["#020a12", 0.005]} />

      <BrainCore paused={paused} />

      <GlobeRotation paused={paused}>
        <AxonNetwork paused={paused} />
        <NeuronBodies paused={paused} />
        <SynapticImpulses paused={paused} />
        <NodeLabels paused={paused} visible={showLabels} />
      </GlobeRotation>

      <CSFParticles paused={paused} />

      {/* Lighting — subtle biological tones */}
      <ambientLight intensity={0.015} />
      <pointLight position={[0, 0, 0]} intensity={0.3} color="#3a8899" distance={25} />
      <pointLight position={[0, 20, 25]} intensity={0.6} color="#1a2a4b" distance={70} />
      <pointLight position={[-20, -10, 15]} intensity={0.25} color="#4a2a3a" distance={50} />
      <pointLight position={[20, 10, -15]} intensity={0.25} color="#2a4a3a" distance={50} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={14}
        maxDistance={60}
        autoRotate={!paused}
        autoRotateSpeed={0.06}
        enablePan
      />

      {/* Bloom — subtle cinematic glow */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.12}
          luminanceSmoothing={0.95}
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
    <div className="bg-[#020a12]/90 backdrop-blur-md rounded px-2 py-0.5 border border-white/[0.06] flex items-center gap-1.5"
      style={{ boxShadow: `0 0 8px ${color}10` }}>
      <span style={{ color }} className={pulse ? "animate-pulse" : ""}>{icon}</span>
      <span className="text-[7px] text-white/25 font-mono tracking-[0.15em] uppercase">{label}</span>
      <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Metrics Overlay — connected to real pipeline data ───
function MetricsOverlay() {
  const [m, setM] = useState({
    latency: 0, sttMs: 0, llmMs: 0, ttsMs: 0,
    threats: 0, blocked: 0, tokens: 0,
  });

  useEffect(() => {
    let mounted = true;
    supabase.from("neural_knowledge_base" as any).select("id", { count: "exact", head: true })
      .then(({ count }) => { if (mounted) setM(p => ({ ...p, tokens: (count ?? 0) * 512 })); });

    const iv = setInterval(() => {
      if (!mounted) return;
      const defense = getDefenseMetrics();
      const lat = getPipelineLatency();
      setM(p => ({
        ...p,
        latency: lat.totalMs > 0 ? Math.round(lat.totalMs) : p.latency,
        sttMs: lat.sttMs > 0 ? Math.round(lat.sttMs) : p.sttMs,
        llmMs: lat.llmMs > 0 ? Math.round(lat.llmMs) : p.llmMs,
        ttsMs: lat.ttsMs > 0 ? Math.round(lat.ttsMs) : p.ttsMs,
        threats: defense.totalThreats,
        blocked: defense.blocked,
      }));
    }, 2000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  return (
    <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="h-2 w-2 rounded-full bg-cyan-400/60 animate-pulse" style={{ boxShadow: "0 0 6px #00e5ff40" }} />
        <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-cyan-300/40">ORION NEUROCORE</span>
        <span className="text-[8px] font-mono text-white/15">v24 · NEURAL HD</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        <HudBadge icon={<Activity className="h-3 w-3" />} label="PIPELINE" value={m.latency > 0 ? `${m.latency}ms` : "—"} color="#3a8899" />
        <HudBadge icon={<Zap className="h-3 w-3" />} label="STT" value={m.sttMs > 0 ? `${m.sttMs}ms` : "—"} color="#4a7788" />
        <HudBadge icon={<Cpu className="h-3 w-3" />} label="LLM" value={m.llmMs > 0 ? `${m.llmMs}ms` : "—"} color="#4a7788" />
        <HudBadge icon={<Brain className="h-3 w-3" />} label="TTS" value={m.ttsMs > 0 ? `${m.ttsMs}ms` : "—"} color="#4a7788" />
      </div>
      <div className="flex gap-1 flex-wrap">
        <HudBadge icon={<Layers className="h-3 w-3" />} label="NODES" value={`${NODE_COUNT}`} color="#556677" />
        <HudBadge icon={<Database className="h-3 w-3" />} label="SYNAPSES" value={`${CONNECTIONS.length}`} color="#556677" />
        <HudBadge icon={<Lock className="h-3 w-3" />} label="THREATS" value={`${m.threats}`} color={m.threats > 0 ? "#884444" : "#447755"} pulse={m.threats > 0} />
        <HudBadge icon={<Shield className="h-3 w-3" />} label="BLOCKED" value={`${m.blocked}`} color="#664444" />
      </div>
    </div>
  );
}

// ─── Category Legend ───
const CATEGORIES = [
  { label: "Core LLM/RAG", color: "#3a7788" },
  { label: "Expert Models", color: "#3a6644" },
  { label: "Vision", color: "#6a4466" },
  { label: "Cognição", color: "#664455" },
  { label: "Memória", color: "#665533" },
  { label: "Ação", color: "#335577" },
  { label: "Defesa", color: "#663333" },
  { label: "I/O", color: "#336666" },
  { label: "Federação", color: "#443366" },
  { label: "Search", color: "#664422" },
];

function CategoryLegend() {
  return (
    <div className="absolute bottom-3 left-3 bg-[#020a12]/90 backdrop-blur-md rounded-lg p-2 border border-white/[0.06] z-10 pointer-events-none max-w-[560px]"
      style={{ boxShadow: "0 0 10px rgba(0,50,80,0.08)" }}>
      <p className="text-[8px] text-cyan-400/20 mb-1.5 font-mono tracking-[0.2em] uppercase">
        ORION NEURAL BRAIN · {NODE_COUNT} Nós · {CONNECTIONS.length} Sinapses · HD Realistic
      </p>
      <div className="grid grid-cols-5 gap-x-3 gap-y-0.5">
        {CATEGORIES.map((cat, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color, boxShadow: `0 0 4px ${cat.color}40` }} />
            <span className="text-[7px] text-white/30 font-mono truncate">{cat.label}</span>
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

  return (
    <Card className="border-cyan-500/10 bg-[#020a12] overflow-hidden shadow-2xl" style={{ boxShadow: "0 0 40px rgba(0,50,80,0.08)" }}>
      <CardContent className="p-0">
        <div className="relative" style={{ height: expanded ? "90vh" : "650px", transition: "height 0.4s cubic-bezier(.4,0,.2,1)" }}>
          <MetricsOverlay />

          {/* Status badge */}
          <div className="absolute top-3 right-14 z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-[#020a12]/90 backdrop-blur-md rounded px-3 py-1 border border-white/[0.06]"
              style={{ boxShadow: paused ? "0 0 6px rgba(120,100,50,0.1)" : "0 0 6px rgba(50,100,80,0.1)" }}>
              <div className={`h-2 w-2 rounded-full ${paused ? "bg-amber-700" : "bg-emerald-700 animate-pulse"}`}
                style={{ boxShadow: paused ? "0 0 4px #78643280" : "0 0 4px #34645040" }} />
              <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: paused ? "#786432" : "#346450" }}>
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
              toneMappingExposure: 1.2,
              powerPreference: "high-performance",
            }}
            dpr={[1, 1.5]}
            onCreated={({ gl }) => { gl.setClearColor("#020a12"); }}
          >
            <NeuralScene paused={paused} />
          </Canvas>

          <CategoryLegend />

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none z-[5]"
            style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,10,18,0.95) 100%)" }} />
          {/* Top glow edge */}
          <div className="absolute top-0 left-0 right-0 h-px z-[6]"
            style={{ background: "linear-gradient(90deg, transparent 10%, rgba(40,100,120,0.15) 50%, transparent 90%)" }} />

          {/* Controls */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-[#020a12]/90 border-white/[0.08] text-white/30 hover:text-cyan-600 hover:border-cyan-700/25 backdrop-blur-md"
              onClick={() => setExpanded(!expanded)}>
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-[#020a12]/90 border-white/[0.08] text-white/30 hover:text-cyan-600 hover:border-cyan-700/25 backdrop-blur-md"
              onClick={() => setPaused(!paused)}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 w-8 p-0 bg-[#020a12]/90 border-white/[0.08] text-white/30 hover:text-cyan-600 hover:border-cyan-700/25 backdrop-blur-md"
              onClick={() => setKey(k => k + 1)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
