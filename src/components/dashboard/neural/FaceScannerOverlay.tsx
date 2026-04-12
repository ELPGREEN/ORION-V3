/**
 * FaceScannerOverlay — Futuristic face scanner HUD
 * Renders animated scanner corners, 68-point landmarks mesh,
 * emotion bars, age/gender badges, and confidence indicators.
 */
import { memo, useMemo } from "react";

// Inline types (modules removed)
interface DetectedFace {
  x: number; y: number; width: number; height: number; confidence: number;
  landmarks?: { x: number; y: number; type: string }[];
  faceApiData?: FaceApiDetection | null;
}
interface FaceApiDetection {
  score: number;
  expressions?: Record<string, number>;
  landmarks?: { x: number; y: number }[];
}

interface FaceScannerOverlayProps {
  faces: DetectedFace[];
  width: number;
  height: number;
  videoWidth?: number;
  videoHeight?: number;
  tier: "faceapi" | "blazeface" | "native" | "fallback" | "none";
  faceApiDetection?: FaceApiDetection | null;
}

const EMOTION_COLORS: Record<string, string> = {
  neutral: "#94a3b8", happy: "#22c55e", sad: "#3b82f6", angry: "#ef4444",
  fearful: "#a855f7", disgusted: "#f97316", surprised: "#eab308",
};
const EMOTION_LABELS: Record<string, string> = {
  neutral: "Neutro", happy: "Feliz", sad: "Triste", angry: "Irritado",
  fearful: "Medo", disgusted: "Nojo", surprised: "Surpreso",
};
const TIER_COLORS: Record<string, string> = {
  faceapi: "#22c55e", blazeface: "#3b82f6", native: "#eab308", fallback: "#f97316", none: "#64748b",
};
const TIER_LABELS: Record<string, string> = {
  faceapi: "FACE-API", blazeface: "BLAZEFACE", native: "BROWSER", fallback: "HEURÍSTICO", none: "—",
};

const FACE_MESH_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],
  [17,18],[18,19],[19,20],[20,21],[22,23],[23,24],[24,25],[25,26],
  [27,28],[28,29],[29,30],[31,32],[32,33],[33,34],[34,35],
  [36,37],[37,38],[38,39],[39,40],[40,41],[41,36],
  [42,43],[43,44],[44,45],[45,46],[46,47],[47,42],
  [48,49],[49,50],[50,51],[51,52],[52,53],[53,54],[54,55],[55,56],[56,57],[57,58],[58,59],[59,48],
  [60,61],[61,62],[62,63],[63,64],[64,65],[65,66],[66,67],[67,60],
];

function FaceScannerOverlayInner({
  faces, width, height, videoWidth, videoHeight, tier, faceApiDetection,
}: FaceScannerOverlayProps) {
  const vw = videoWidth || width;
  const vh = videoHeight || height;
  const sx = width / vw;
  const sy = height / vh;

  const expressions = useMemo(() => {
    if (!faceApiDetection?.expressions) return [];
    return Object.entries(faceApiDetection.expressions)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);
  }, [faceApiDetection]);

  if (!faces.length) return null;
  const dominantEmotion = expressions[0];

  return (
    <svg className="absolute inset-0 pointer-events-none z-20" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,229,255,0)" />
          <stop offset="45%" stopColor="rgba(0,229,255,0.15)" />
          <stop offset="50%" stopColor="rgba(0,229,255,0.6)" />
          <stop offset="55%" stopColor="rgba(0,229,255,0.15)" />
          <stop offset="100%" stopColor="rgba(0,229,255,0)" />
        </linearGradient>
        <filter id="faceGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {faces.map((face, fi) => {
        const x = face.x * sx;
        const y = face.y * sy;
        const w = face.width * sx;
        const h = face.height * sy;
        const cornerLen = Math.min(w, h) * 0.18;
        const conf = Math.round(face.confidence * 100);
        const accentColor = fi === 0
          ? (dominantEmotion ? EMOTION_COLORS[dominantEmotion[0]] || "#00e5ff" : "#00e5ff")
          : "#00e5ff";
        const faceApiData = face.faceApiData || (fi === 0 ? faceApiDetection : null);
        const points68 = faceApiData?.landmarks || [];
        const hasFullMesh = points68.length >= 68;

        return (
          <g key={fi}>
            {fi === 0 && (
              <rect x={x} y={y} width={w} height={h} fill="url(#scanGrad)" opacity={0.4}>
                <animate attributeName="y" values={`${y};${y + h};${y}`} dur="2.5s" repeatCount="indefinite" />
              </rect>
            )}
            <g filter="url(#faceGlow)">
              <polyline points={`${x},${y + cornerLen} ${x},${y} ${x + cornerLen},${y}`} fill="none" stroke={accentColor} strokeWidth={2.5} strokeLinecap="round">
                <animate attributeName="stroke-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
              </polyline>
              <polyline points={`${x + w - cornerLen},${y} ${x + w},${y} ${x + w},${y + cornerLen}`} fill="none" stroke={accentColor} strokeWidth={2.5} strokeLinecap="round">
                <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
              </polyline>
              <polyline points={`${x},${y + h - cornerLen} ${x},${y + h} ${x + cornerLen},${y + h}`} fill="none" stroke={accentColor} strokeWidth={2.5} strokeLinecap="round">
                <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
              </polyline>
              <polyline points={`${x + w - cornerLen},${y + h} ${x + w},${y + h} ${x + w},${y + h - cornerLen}`} fill="none" stroke={accentColor} strokeWidth={2.5} strokeLinecap="round">
                <animate attributeName="stroke-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
              </polyline>
            </g>
            {hasFullMesh && (
              <g opacity={0.6}>
                {FACE_MESH_CONNECTIONS.map(([a, b], ci) => {
                  const pa = points68[a]; const pb = points68[b];
                  if (!pa || !pb) return null;
                  return <line key={ci} x1={pa.x * sx} y1={pa.y * sy} x2={pb.x * sx} y2={pb.y * sy} stroke={accentColor} strokeWidth={0.6} opacity={0.4} />;
                })}
                {points68.map((pt, pi) => <circle key={pi} cx={pt.x * sx} cy={pt.y * sy} r={1} fill={accentColor} opacity={0.7} />)}
              </g>
            )}
            {!hasFullMesh && face.landmarks && face.landmarks.length > 0 && (
              <g>
                {face.landmarks.filter(l => !l.type.startsWith("point_")).map((lm, li) => (
                  <g key={li}>
                    <circle cx={lm.x * sx} cy={lm.y * sy} r={2.5} fill={accentColor} opacity={0.9} />
                    <circle cx={lm.x * sx} cy={lm.y * sy} r={5} fill="none" stroke={accentColor} strokeWidth={0.5} opacity={0.4}>
                      <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </g>
                ))}
              </g>
            )}
            {(() => {
              const cx = x + w / 2;
              const cy = y + h + 16;
              const r = Math.min(w, 40) * 0.35;
              const angle = (conf / 100) * Math.PI;
              const endX = cx + r * Math.cos(Math.PI - angle);
              const endY = cy - r * Math.sin(Math.PI - angle);
              return (
                <g>
                  <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
                  <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${angle > Math.PI / 2 ? 1 : 0} 1 ${endX} ${endY}`} fill="none" stroke={accentColor} strokeWidth={2} strokeLinecap="round" />
                  <text x={cx} y={cy + 10} fill="rgba(255,255,255,0.7)" fontSize={8} fontFamily="monospace" textAnchor="middle">{conf}%</text>
                </g>
              );
            })()}
            <rect x={x} y={y - 16} width={58} height={13} rx={2} fill={TIER_COLORS[tier]} opacity={0.8} />
            <text x={x + 4} y={y - 6} fill="#000" fontSize={8} fontFamily="monospace" fontWeight="bold">{TIER_LABELS[tier]}</text>
            {fi === 0 && expressions.length > 0 && (
              <g>
                {expressions.map(([emotion, score], ei) => {
                  const barX = x + w + 8;
                  const barY = y + ei * 16;
                  const barW = 60;
                  const barH = 10;
                  const scoreNum = score as number;
                  const fillW = scoreNum * barW;
                  const color = EMOTION_COLORS[emotion] || "#94a3b8";
                  const label = EMOTION_LABELS[emotion] || emotion;
                  return (
                    <g key={emotion}>
                      <text x={barX} y={barY - 1} fill="rgba(255,255,255,0.6)" fontSize={7} fontFamily="monospace">{label}</text>
                      <rect x={barX} y={barY + 1} width={barW} height={barH} rx={1} fill="rgba(255,255,255,0.08)" />
                      <rect x={barX} y={barY + 1} width={fillW} height={barH} rx={1} fill={color} opacity={0.85}>
                        <animate attributeName="width" from={fillW * 0.8} to={fillW} dur="0.3s" fill="freeze" />
                      </rect>
                      <text x={barX + barW + 4} y={barY + 9} fill={color} fontSize={7} fontFamily="monospace" fontWeight="bold">{Math.round(scoreNum * 100)}%</text>
                    </g>
                  );
                })}
                {dominantEmotion && (
                  <g>
                    <rect x={x + w + 8} y={y + expressions.length * 16 + 6} width={80} height={16} rx={3}
                      fill={EMOTION_COLORS[dominantEmotion[0]] || "#94a3b8"} opacity={0.15}
                      stroke={EMOTION_COLORS[dominantEmotion[0]] || "#94a3b8"} strokeWidth={0.5} />
                    <text x={x + w + 12} y={y + expressions.length * 16 + 17}
                      fill={EMOTION_COLORS[dominantEmotion[0]] || "#94a3b8"} fontSize={9} fontFamily="monospace" fontWeight="bold">
                      {(EMOTION_LABELS[dominantEmotion[0]] || dominantEmotion[0]).toUpperCase()}
                    </text>
                  </g>
                )}
              </g>
            )}
            <text x={x + w / 2} y={y - 20} fill={accentColor} fontSize={10} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              {tier === "faceapi" ? `FACE ${fi + 1} • ${conf}%` : `ROSTO ${fi + 1}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const FaceScannerOverlay = memo(FaceScannerOverlayInner);
