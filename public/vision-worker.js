// ═══ Vision Processing Web Worker v3 — Conscious Neural Vision ═══
// Edge detection, face mapping, object recognition, motion flow → particle projection

self.onmessage = function(e) {
  try {
    const { type, data } = e.data;
    switch (type) {
      case "extractEdges":
        self.postMessage({ type: "edges", result: extractEdgePoints(data.pixels, data.w, data.h, data.threshold || 40) });
        break;
      case "detectRegions":
        self.postMessage({ type: "regions", result: detectRegions(data.pixels, data.w, data.h) });
        break;
      case "computeMotion":
        self.postMessage({ type: "motion", result: computeMotionFlow(data.prev, data.curr, data.w, data.h) });
        break;
      case "extractSilhouette":
        self.postMessage({ type: "silhouette", result: extractSilhouette(data.pixels, data.w, data.h) });
        break;
      default:
        console.warn("Vision worker: unknown message type:", type);
    }
  } catch (err) {
    console.error("Vision worker error:", err);
    self.postMessage({ type: "error", result: { message: err.message } });
  }
};

function extractEdgePoints(pixels, w, h, threshold) {
  if (!pixels || !w || !h) return [];
  const points = [];
  const step = 2;
  const maxPoints = 2000;
  
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const i = (y * w + x) * 4;
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      
      const iL = (y * w + (x-1)) * 4;
      const iR = (y * w + (x+1)) * 4;
      const gx = Math.abs(pixels[iR] - pixels[iL]) + 
                 Math.abs(pixels[iR+1] - pixels[iL+1]) + 
                 Math.abs(pixels[iR+2] - pixels[iL+2]);
      
      const iU = ((y-1) * w + x) * 4;
      const iD = ((y+1) * w + x) * 4;
      const gy = Math.abs(pixels[iD] - pixels[iU]) + 
                 Math.abs(pixels[iD+1] - pixels[iU+1]) + 
                 Math.abs(pixels[iD+2] - pixels[iU+2]);
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      
      if (magnitude > threshold) {
        const nx = (x / w) * 2 - 1;
        const ny = -((y / h) * 2 - 1);
        const brightness = (r + g + b) / (255 * 3);
        
        points.push({
          x: nx * 8,
          y: ny * 6,
          z: brightness * 2 - 1,
          r: r / 255,
          g: g / 255,
          b: b / 255,
          intensity: Math.min(1, magnitude / 200),
        });
        
        if (points.length >= maxPoints) return points;
      }
    }
  }
  
  return points;
}

function extractSilhouette(pixels, w, h) {
  if (!pixels || !w || !h) return [];
  const points = [];
  const step = 3;
  const maxPoints = 1500;
  
  let totalBright = 0, count = 0;
  for (let i = 0; i < pixels.length; i += 16) {
    totalBright += (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
    count++;
  }
  const avgBright = count > 0 ? totalBright / count : 128;
  
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      const bright = (r + g + b) / 3;
      
      const diff = Math.abs(bright - avgBright);
      if (diff > 25) {
        const nx = (x / w) * 2 - 1;
        const ny = -((y / h) * 2 - 1);
        
        points.push({
          x: nx * 8,
          y: ny * 6,
          z: (diff / 128) * 1.5,
          r: r / 255,
          g: g / 255,
          b: b / 255,
          intensity: Math.min(1, diff / 100),
        });
        
        if (points.length >= maxPoints) return points;
      }
    }
  }
  
  return points;
}

function detectRegions(pixels, w, h) {
  if (!pixels || !w || !h) return [];
  const regions = [];
  const cellW = Math.floor(w / 8), cellH = Math.floor(h / 6);
  if (cellW <= 0 || cellH <= 0) return [];
  
  for (let cy = 0; cy < 6; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0, edgeCount = 0;
      const startX = cx * cellW, startY = cy * cellH;
      
      for (let y = startY; y < Math.min(startY + cellH, h); y += 3) {
        for (let x = startX; x < Math.min(startX + cellW, w); x += 3) {
          const i = (y * w + x) * 4;
          if (i + 3 >= pixels.length) continue;
          rSum += pixels[i]; gSum += pixels[i+1]; bSum += pixels[i+2];
          count++;
          
          if (x > 0 && y > 0 && x + 1 < w && y + 1 < h) {
            const iR = (y * w + x + 1) * 4;
            const iD = ((y+1) * w + x) * 4;
            if (iR + 3 < pixels.length && iD + 3 < pixels.length) {
              if (Math.abs(pixels[iR] - pixels[i]) + Math.abs(pixels[iD] - pixels[i]) > 60) edgeCount++;
            }
          }
        }
      }
      
      if (!count) continue;
      const avgR = rSum/count, avgG = gSum/count, avgB = bSum/count;
      const brightness = (avgR + avgG + avgB) / 3;
      const saturation = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);
      const edgeDensity = edgeCount / count;
      
      let label = "background", category = "bg";
      
      if (avgR > 140 && avgG > 85 && avgB > 60 && avgR > avgB * 1.1 && saturation > 15 && saturation < 120) {
        label = "Rosto"; category = "face";
      } else if (edgeDensity > 0.25 && brightness > 40) {
        label = "Estrutura"; category = "structure";
      } else if (saturation > 60) {
        if (avgR > avgG * 1.3 && avgR > avgB * 1.3) { label = "Vermelho"; category = "color"; }
        else if (avgG > avgR * 1.2 && avgG > avgB * 1.2) { label = "Verde"; category = "color"; }
        else if (avgB > avgR * 1.2 && avgB > avgG * 1.2) { label = "Azul"; category = "color"; }
        else { label = "Colorido"; category = "color"; }
      } else if (brightness > 180) {
        label = "Luz"; category = "light";
      } else if (edgeDensity > 0.12 && saturation < 30) {
        label = "Texto"; category = "text";
      }
      
      const confidence = Math.min(0.97, edgeDensity * 0.4 + saturation / 300 + brightness / 500);
      
      if (category !== "bg" && confidence > 0.1) {
        regions.push({
          label, category, confidence,
          cx: startX + cellW/2, cy: startY + cellH/2,
          x: startX, y: startY, w: cellW, h: cellH,
          avgR, avgG, avgB, edgeDensity: Math.round(edgeDensity * 100),
        });
      }
    }
  }
  
  return regions.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

function computeMotionFlow(prev, curr, w, h) {
  if (!prev || !curr) return { intensity: 0, direction: "●", zones: Array(9).fill(false), vectors: [] };
  
  const vectors = [];
  const zones = Array(9).fill(0);
  const zoneCounts = Array(9).fill(0);
  const zoneW = Math.max(1, Math.floor(w / 3));
  const zoneH = Math.max(1, Math.floor(h / 3));
  let totalDiff = 0, blocks = 0;
  const blockSize = 12;
  
  const blocksX = Math.floor(w / blockSize);
  const blocksY = Math.floor(h / blockSize);
  
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let diff = 0, samples = 0;
      for (let y = by*blockSize; y < (by+1)*blockSize && y < h; y += 3) {
        for (let x = bx*blockSize; x < (bx+1)*blockSize && x < w; x += 3) {
          const i = (y * w + x) * 4;
          if (i + 2 >= curr.length || i + 2 >= prev.length) continue;
          diff += Math.abs(curr[i] - prev[i]) + Math.abs(curr[i+1] - prev[i+1]) + Math.abs(curr[i+2] - prev[i+2]);
          samples++;
        }
      }
      
      const avgDiff = samples > 0 ? diff / samples : 0;
      blocks++;
      
      const px = bx * blockSize + blockSize/2;
      const py = by * blockSize + blockSize/2;
      const zx = Math.min(Math.floor(px / zoneW), 2);
      const zy = Math.min(Math.floor(py / zoneH), 2);
      zones[zy * 3 + zx] += avgDiff > 30 ? 1 : 0;
      zoneCounts[zy * 3 + zx]++;
      
      if (avgDiff > 30) {
        totalDiff++;
        vectors.push({
          x: (px / w) * 2 - 1,
          y: -((py / h) * 2 - 1),
          magnitude: Math.min(1, avgDiff / 150),
        });
      }
    }
  }
  
  const intensity = blocks > 0 ? Math.min(100, (totalDiff / blocks) * 300) : 0;
  const activeZones = zones.map((z, i) => (z / Math.max(1, zoneCounts[i])) > 0.15);
  
  const left = zones[0]+zones[3]+zones[6], right = zones[2]+zones[5]+zones[8];
  const up = zones[0]+zones[1]+zones[2], down = zones[6]+zones[7]+zones[8];
  let direction = "●";
  const mx = Math.max(left, right, up, down);
  if (mx > 2) {
    if (mx === left) direction = "←";
    else if (mx === right) direction = "→";
    else if (mx === up) direction = "↑";
    else direction = "↓";
  }
  
  return { intensity, direction, zones: activeZones, vectors: vectors.slice(0, 60) };
}
