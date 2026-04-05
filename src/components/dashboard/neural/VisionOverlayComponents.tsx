import { useRef, useEffect } from "react";

// ═══ Camera PiP ═══
export function CameraPiP({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) { ref.current.srcObject = stream; ref.current.play().catch(() => {}); }
  }, [stream]);
  return <video ref={ref} className="w-full h-full object-cover" playsInline muted style={{ transform: "scaleX(-1)" }} />;
}

// ═══ Bounding Box Overlay ═══
export const BBOX_CATEGORY_COLORS: Record<string, string> = {
  pessoa: "#00e5ff", eletrônico: "#7c4dff", móvel: "#ffd740", documento: "#69f0ae",
  veículo: "#ff6e40", animal: "#ea80fc", alimento: "#ffab40", vestuário: "#80d8ff",
  ambiente: "#b9f6ca", ferramenta: "#ff80ab", código: "#84ffff", embalagem: "#ffe57f",
  esporte: "#a7ffeb", instrumento: "#b388ff", arte: "#f48fb1", outro: "#90a4ae",
};

export const POSITION_MAP: Record<string, { x: number; y: number }> = {
  "centro": { x: 0.5, y: 0.5 }, "esquerda": { x: 0.2, y: 0.5 }, "direita": { x: 0.8, y: 0.5 },
  "topo": { x: 0.5, y: 0.2 }, "fundo": { x: 0.5, y: 0.8 },
  "centro-esquerda": { x: 0.35, y: 0.5 }, "centro-direita": { x: 0.65, y: 0.5 },
  "topo-esquerda": { x: 0.2, y: 0.2 }, "topo-direita": { x: 0.8, y: 0.2 },
  "fundo-esquerda": { x: 0.2, y: 0.8 }, "fundo-direita": { x: 0.8, y: 0.8 },
};

export const DISTANCE_SCALE: Record<string, number> = {
  "muito-próximo": 0.4, "próximo": 0.3, "médio": 0.22, "longe": 0.16, "muito-longe": 0.12,
};

/**
 * BoundingBoxOverlay — renders bounding boxes from two sources:
 * 1. Real ML detections (MediaPipe + YOLO) with actual pixel coordinates
 * 2. AI API objects with estimated position/distance (fallback)
 */
export interface BBoxObject {
  name: string;
  category: string;
  confidence: number;
  count: number;
  position?: string;
  distance?: string;
  /** Real bounding box in original video coordinates (from ML detectors) */
  bbox?: { x: number; y: number; w: number; h: number };
  source?: "mediapipe" | "yolo" | "both" | "api";
}

export function BoundingBoxOverlay({ objects, width, height, videoWidth, videoHeight }: {
  objects: BBoxObject[];
  width: number; height: number;
  /** Original video dimensions for coordinate scaling (default: same as width/height) */
  videoWidth?: number; videoHeight?: number;
}) {
  if (!objects.length) return null;
  const vw = videoWidth || width;
  const vh = videoHeight || height;
  const sx = width / vw;
  const sy = height / vh;

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {objects.map((obj, i) => {
        const color = BBOX_CATEGORY_COLORS[obj.category] || BBOX_CATEGORY_COLORS.outro;
        let x: number, y: number, bw: number, bh: number;

        if (obj.bbox) {
          // Real ML bounding box — scale from video coords to overlay coords
          x = Math.max(1, obj.bbox.x * sx);
          y = Math.max(1, obj.bbox.y * sy);
          bw = Math.min(obj.bbox.w * sx, width - x - 1);
          bh = Math.min(obj.bbox.h * sy, height - y - 1);
        } else {
          // Fallback: estimated position/distance from AI API
          const pos = POSITION_MAP[obj.position || "centro"] || POSITION_MAP.centro;
          const scale = DISTANCE_SCALE[obj.distance || "médio"] || 0.22;
          bw = width * scale;
          bh = height * scale;
          const cx = pos.x * width;
          const cy = pos.y * height;
          x = Math.max(1, Math.min(cx - bw / 2, width - bw - 1));
          y = Math.max(1, Math.min(cy - bh / 2, height - bh - 1));
        }

        // Clamp to valid dimensions
        if (bw < 4 || bh < 4) return null;
        const conf = Math.round(obj.confidence * 100);
        const isReal = !!obj.bbox;

        return (
          <g key={`${obj.name}-${i}`}>
            <rect x={x} y={y} width={bw} height={bh} fill="none" stroke={color} strokeWidth={isReal ? 2 : 1.5}
              rx={2} opacity={isReal ? 0.95 : 0.7} strokeDasharray={!isReal && obj.confidence < 0.5 ? "3,2" : "none"} />
            <rect x={x} y={y - 11} width={Math.max(bw, 36)} height={11} fill={color} opacity={0.75} rx={1} />
            <text x={x + 2} y={y - 2.5} fill="#000" fontSize={7} fontFamily="monospace" fontWeight="bold">
              {obj.name}{obj.count > 1 ? ` ×${obj.count}` : ""} {conf}%
            </text>
            {/* Corner brackets */}
            <line x1={x} y1={y + 4} x2={x} y2={y} stroke={color} strokeWidth={2} />
            <line x1={x} y1={y} x2={x + 4} y2={y} stroke={color} strokeWidth={2} />
            <line x1={x + bw - 4} y1={y} x2={x + bw} y2={y} stroke={color} strokeWidth={2} />
            <line x1={x + bw} y1={y} x2={x + bw} y2={y + 4} stroke={color} strokeWidth={2} />
            <line x1={x} y1={y + bh - 4} x2={x} y2={y + bh} stroke={color} strokeWidth={2} />
            <line x1={x} y1={y + bh} x2={x + 4} y2={y + bh} stroke={color} strokeWidth={2} />
            <line x1={x + bw - 4} y1={y + bh} x2={x + bw} y2={y + bh} stroke={color} strokeWidth={2} />
            <line x1={x + bw} y1={y + bh - 4} x2={x + bw} y2={y + bh} stroke={color} strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
}
