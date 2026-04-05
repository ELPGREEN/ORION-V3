/**
 * ─── Scene Reconstruction 3D Engine ───
 * Converts depth maps (MiDaS/Depth Anything) + YOLO detections
 * into 3D point clouds for visualization and spatial reasoning.
 * 
 * Pipeline:
 *   1. Depth map → 3D point cloud (pinhole camera model)
 *   2. YOLO detections → labeled 3D bounding boxes
 *   3. Temporal smoothing for stable reconstruction
 *   4. Export for Three.js / R3F rendering
 */

import type { DepthEstimationResult } from "./depth-estimation-engine";

// ─── Types ───

export interface Point3D {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  /** Normalized depth 0..1 */
  depth: number;
}

export interface Object3D {
  id: string;
  label: string;
  labelPt: string;
  confidence: number;
  /** Center position in 3D space */
  position: { x: number; y: number; z: number };
  /** Estimated bounding box size in meters */
  size: { width: number; height: number; depth: number };
  /** Average depth normalized */
  depthNorm: number;
  /** Estimated distance in meters */
  distanceM: number;
  /** Color for visualization */
  color: string;
}

export interface SceneReconstruction {
  /** Sparse point cloud (downsampled for performance) */
  points: Float32Array; // interleaved [x,y,z,r,g,b, x,y,z,r,g,b, ...]
  pointCount: number;
  /** Detected objects as 3D boxes */
  objects: Object3D[];
  /** Scene bounds */
  bounds: {
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
  };
  /** Reconstruction metadata */
  meta: {
    timestamp: number;
    depthInferenceMs: number;
    reconstructionMs: number;
    sourceWidth: number;
    sourceHeight: number;
  };
}

// ─── Camera intrinsics (approximate for typical webcam) ───

interface CameraIntrinsics {
  fx: number; // focal length x (pixels)
  fy: number; // focal length y (pixels)
  cx: number; // principal point x
  cy: number; // principal point y
  /** Near/far depth range in meters */
  nearM: number;
  farM: number;
}

function estimateIntrinsics(width: number, height: number): CameraIntrinsics {
  // Approximate 60° FOV webcam
  const fov = 60 * (Math.PI / 180);
  const fx = width / (2 * Math.tan(fov / 2));
  const fy = fx; // square pixels assumed
  return {
    fx, fy,
    cx: width / 2,
    cy: height / 2,
    nearM: 0.3,
    farM: 10.0,
  };
}

// ─── Color palette for objects ───

const OBJECT_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F1948A", "#82E0AA",
  "#F0B27A", "#AED6F1", "#D7BDE2", "#A3E4D7",
];

let colorIndex = 0;
function getObjectColor(label: string): string {
  // Consistent color per label via simple hash
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  }
  return OBJECT_COLORS[Math.abs(hash) % OBJECT_COLORS.length];
}

// ─── State for temporal smoothing ───

let prevReconstruction: SceneReconstruction | null = null;
const SMOOTHING_ALPHA = 0.3; // Blend factor (0=full previous, 1=full current)

// ─── Core reconstruction ───

/**
 * Reconstruct 3D scene from depth map + video frame + detections.
 * 
 * @param depthResult - MiDaS depth estimation output
 * @param video - Source video element (for RGB sampling)
 * @param detections - YOLO/MediaPipe detected objects
 * @param downsample - Skip every N pixels (2=quarter points, 4=1/16 points)
 */
export function reconstructScene(
  depthResult: DepthEstimationResult,
  video: HTMLVideoElement,
  detections: Array<{
    name: string;
    namePt: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>,
  downsample = 4,
): SceneReconstruction {
  const start = performance.now();
  const { depthMap, width: dw, height: dh } = depthResult;
  const cam = estimateIntrinsics(dw, dh);

  // ── Step 1: Sample RGB from video ──
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, dw, dh);
  const imageData = ctx.getImageData(0, 0, dw, dh);
  const pixels = imageData.data;

  // ── Step 2: Depth → 3D point cloud ──
  const stepX = Math.max(1, Math.round(downsample));
  const stepY = Math.max(1, Math.round(downsample));
  const maxPoints = Math.ceil(dw / stepX) * Math.ceil(dh / stepY);
  
  // Interleaved buffer: x, y, z, r, g, b (6 floats per point)
  const buffer = new Float32Array(maxPoints * 6);
  let pointCount = 0;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let py = 0; py < dh; py += stepY) {
    for (let px = 0; px < dw; px += stepX) {
      const idx = py * dw + px;
      const depthNorm = depthMap[idx];
      
      // Skip invalid or extreme depths
      if (depthNorm <= 0.01 || depthNorm >= 0.99) continue;

      // Depth in meters (inverse mapping: lower norm = farther)
      const z = cam.nearM + (1 - depthNorm) * (cam.farM - cam.nearM);

      // Backproject to 3D using pinhole model
      const x = ((px - cam.cx) / cam.fx) * z;
      const y = ((py - cam.cy) / cam.fy) * z;

      // RGB from video
      const pixIdx = idx * 4;
      const r = pixels[pixIdx] / 255;
      const g = pixels[pixIdx + 1] / 255;
      const b = pixels[pixIdx + 2] / 255;

      // Write to interleaved buffer
      const off = pointCount * 6;
      buffer[off] = x;
      buffer[off + 1] = -y; // Flip Y for Three.js coordinate system
      buffer[off + 2] = -z; // Negative Z = into screen
      buffer[off + 3] = r;
      buffer[off + 4] = g;
      buffer[off + 5] = b;
      pointCount++;

      // Track bounds
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (-y < minY) minY = -y;
      if (-y > maxY) maxY = -y;
      if (-z < minZ) minZ = -z;
      if (-z > maxZ) maxZ = -z;
    }
  }

  // Trim buffer to actual size
  const points = buffer.slice(0, pointCount * 6);

  // ── Step 3: Detections → 3D objects ──
  const objects: Object3D[] = detections.slice(0, 20).map((det, i) => {
    // Get average depth in detection bbox (mapped to depth map coords)
    const scaleX = dw / video.videoWidth;
    const scaleY = dh / video.videoHeight;
    const bx1 = Math.max(0, Math.round(det.x * scaleX));
    const by1 = Math.max(0, Math.round(det.y * scaleY));
    const bx2 = Math.min(dw - 1, Math.round((det.x + det.width) * scaleX));
    const by2 = Math.min(dh - 1, Math.round((det.y + det.height) * scaleY));

    // Sample center 50% for stable depth
    const cx1 = Math.round(bx1 + (bx2 - bx1) * 0.25);
    const cx2 = Math.round(bx1 + (bx2 - bx1) * 0.75);
    const cy1 = Math.round(by1 + (by2 - by1) * 0.25);
    const cy2 = Math.round(by1 + (by2 - by1) * 0.75);

    let sum = 0, count = 0;
    for (let y = cy1; y <= cy2; y++) {
      for (let x = cx1; x <= cx2; x++) {
        const dIdx = y * dw + x;
        if (dIdx < depthMap.length) {
          sum += depthMap[dIdx];
          count++;
        }
      }
    }

    const avgDepth = count > 0 ? sum / count : 0.5;
    const z = cam.nearM + (1 - avgDepth) * (cam.farM - cam.nearM);

    // Center of bbox in 3D
    const centerPx = (bx1 + bx2) / 2;
    const centerPy = (by1 + by2) / 2;
    const posX = ((centerPx - cam.cx) / cam.fx) * z;
    const posY = -((centerPy - cam.cy) / cam.fy) * z;

    // Estimate 3D size from 2D bbox + depth
    const widthM = ((bx2 - bx1) / cam.fx) * z;
    const heightM = ((by2 - by1) / cam.fy) * z;

    return {
      id: `${det.name}_${i}`,
      label: det.name,
      labelPt: det.namePt,
      confidence: det.confidence,
      position: { x: posX, y: posY, z: -z },
      size: { width: widthM, height: heightM, depth: widthM * 0.5 },
      depthNorm: Math.round(avgDepth * 100) / 100,
      distanceM: Math.round(z * 10) / 10,
      color: getObjectColor(det.name),
    };
  });

  // ── Step 4: Temporal smoothing for objects ──
  if (prevReconstruction) {
    for (const obj of objects) {
      const prev = prevReconstruction.objects.find(p => p.label === obj.label);
      if (prev) {
        obj.position.x = prev.position.x * (1 - SMOOTHING_ALPHA) + obj.position.x * SMOOTHING_ALPHA;
        obj.position.y = prev.position.y * (1 - SMOOTHING_ALPHA) + obj.position.y * SMOOTHING_ALPHA;
        obj.position.z = prev.position.z * (1 - SMOOTHING_ALPHA) + obj.position.z * SMOOTHING_ALPHA;
        obj.distanceM = Math.round(
          (prev.distanceM * (1 - SMOOTHING_ALPHA) + obj.distanceM * SMOOTHING_ALPHA) * 10
        ) / 10;
      }
    }
  }

  const reconstruction: SceneReconstruction = {
    points,
    pointCount,
    objects,
    bounds: {
      minX: minX === Infinity ? -5 : minX,
      maxX: maxX === -Infinity ? 5 : maxX,
      minY: minY === Infinity ? -5 : minY,
      maxY: maxY === -Infinity ? 5 : maxY,
      minZ: minZ === Infinity ? -10 : minZ,
      maxZ: maxZ === -Infinity ? 0 : maxZ,
    },
    meta: {
      timestamp: Date.now(),
      depthInferenceMs: depthResult.inferenceMs,
      reconstructionMs: Math.round(performance.now() - start),
      sourceWidth: dw,
      sourceHeight: dh,
    },
  };

  prevReconstruction = reconstruction;
  return reconstruction;
}

/**
 * Format 3D reconstruction data for AI spatial reasoning.
 */
export function format3DForAI(scene: SceneReconstruction): string {
  if (scene.objects.length === 0) return "";

  const objectDescriptions = scene.objects.map(o =>
    `${o.labelPt}: pos(${o.position.x.toFixed(1)}, ${o.position.y.toFixed(1)}, ${o.position.z.toFixed(1)})m, dist=${o.distanceM}m, tamanho=${o.size.width.toFixed(1)}x${o.size.height.toFixed(1)}m`
  ).join(" | ");

  return `RECONSTRUÇÃO 3D (${scene.pointCount} pontos): ${objectDescriptions} [${scene.meta.reconstructionMs}ms]`;
}

/**
 * Reset temporal smoothing state.
 */
export function resetReconstruction(): void {
  prevReconstruction = null;
}
