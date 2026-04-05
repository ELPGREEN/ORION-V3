/**
 * ─── Face Detection Fallback (Tier 3) ───
 * Skin-tone + Sobel edge detection + HOG confirmation.
 * Used when neither BlazeFace nor Browser FaceDetector are available.
 */

import type { DetectedFace } from "@/hooks/useFaceDetection";

// ─── Sobel Edge Detection (3x3 kernel) ───
export function sobelEdgeMagnitude(
  gray: number[], w: number, h: number, x: number, y: number
): number {
  if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1) return 0;
  const g = (px: number, py: number) => gray[py * w + px] || 0;
  const gx =
    -g(x - 1, y - 1) + g(x + 1, y - 1) +
    -2 * g(x - 1, y) + 2 * g(x + 1, y) +
    -g(x - 1, y + 1) + g(x + 1, y + 1);
  const gy =
    -g(x - 1, y - 1) - 2 * g(x, y - 1) - g(x + 1, y - 1) +
    g(x - 1, y + 1) + 2 * g(x, y + 1) + g(x + 1, y + 1);
  return Math.sqrt(gx * gx + gy * gy);
}

// ─── HOG-like gradient histogram for face confirmation ───
export function computeHOGScore(gray: number[], w: number, h: number, rx: number, ry: number, rw: number, rh: number): number {
  if (rw < 4 || rh < 4) return 0;
  const cellSize = Math.max(2, Math.floor(Math.min(rw, rh) / 4));
  let edgeSum = 0, count = 0;
  const step = Math.max(1, Math.floor(cellSize / 2));

  for (let y = ry + 1; y < Math.min(ry + rh, h) - 1; y += step) {
    for (let x = rx + 1; x < Math.min(rx + rw, w) - 1; x += step) {
      edgeSum += sobelEdgeMagnitude(gray, w, h, x, y);
      count++;
    }
  }

  const avgEdge = count > 0 ? edgeSum / count : 0;
  if (avgEdge < 8) return 0.1;
  if (avgEdge > 200) return 0.2;
  return Math.min(1, 0.3 + 0.7 * Math.exp(-((avgEdge - 60) ** 2) / 2000));
}

// ─── Main Fallback Detection ───
export function detectFacesFallbackFromImageData(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): DetectedFace[] {
  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;
  const faces: DetectedFace[] = [];

  // 1. Convert to grayscale
  const gray = new Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = Math.round(0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2]);
  }

  // 2. Grid-based skin tone detection
  const gridX = 12, gridY = 10;
  const cellW = Math.floor(w / gridX);
  const cellH = Math.floor(h / gridY);
  const skinMap: boolean[][] = Array.from({ length: gridY }, () => Array(gridX).fill(false));
  const edgeMap: number[][] = Array.from({ length: gridY }, () => Array(gridX).fill(0));

  for (let gy = 0; gy < gridY; gy++) {
    for (let gx = 0; gx < gridX; gx++) {
      let skinCount = 0, total = 0, edgeSum = 0;
      const sx = gx * cellW, sy = gy * cellH;
      for (let y = sy; y < Math.min(sy + cellH, h); y += 3) {
        for (let x = sx; x < Math.min(sx + cellW, w); x += 3) {
          const i = (y * w + x) * 4;
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const isSkin = (
            (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && (r - b) > 15 && (r - g) < 100) ||
            (r > 60 && g > 30 && b > 15 && r > g && (r - g) > 5 && (r - b) > 5 && r < 200)
          );
          if (isSkin) skinCount++;
          total++;
          edgeSum += sobelEdgeMagnitude(gray, w, h, x, y);
        }
      }
      skinMap[gy][gx] = total > 0 && (skinCount / total) > 0.3;
      edgeMap[gy][gx] = total > 0 ? edgeSum / total : 0;
    }
  }

  // 3. Find connected skin regions (BFS) + validate with edge/HOG
  const visited = Array.from({ length: gridY }, () => Array(gridX).fill(false));
  for (let gy = 0; gy < gridY; gy++) {
    for (let gx = 0; gx < gridX; gx++) {
      if (!skinMap[gy][gx] || visited[gy][gx]) continue;
      const queue = [{ x: gx, y: gy }];
      visited[gy][gx] = true;
      let minX = gx, maxX = gx, minY = gy, maxY = gy;
      let cells = 0, totalEdge = 0;

      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift()!;
        cells++;
        totalEdge += edgeMap[cy][cx];
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < gridX && ny >= 0 && ny < gridY && !visited[ny][nx] && skinMap[ny][nx]) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }

      const regionW = maxX - minX + 1;
      const regionH = maxY - minY + 1;
      const aspect = regionW / regionH;
      const avgEdge = cells > 0 ? totalEdge / cells : 0;

      if (cells >= 3 && aspect > 0.5 && aspect < 1.8 && avgEdge > 5) {
        const fx = minX * cellW;
        const fy = minY * cellH;
        const fw = regionW * cellW;
        const fh = regionH * cellH;

        const hogScore = computeHOGScore(gray, w, h, fx, fy, fw, fh);
        if (hogScore < 0.25) continue;

        const skinConf = Math.min(0.85, cells / 12 + (aspect > 0.7 && aspect < 1.3 ? 0.2 : 0));
        const conf = skinConf * 0.6 + hogScore * 0.4;

        faces.push({
          x: fx, y: fy, width: fw, height: fh,
          confidence: conf,
          nx: (fx / w) * 2 - 1,
          ny: -((fy / h) * 2 - 1),
          nw: (fw / w) * 2,
          nh: (fh / h) * 2,
          landmarks: [
            { type: "eye", x: fx + fw * 0.35, y: fy + fh * 0.38 },
            { type: "eye", x: fx + fw * 0.65, y: fy + fh * 0.38 },
            { type: "nose", x: fx + fw * 0.5, y: fy + fh * 0.55 },
            { type: "mouth", x: fx + fw * 0.5, y: fy + fh * 0.72 },
          ],
        });
      }
    }
  }

  return faces.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
