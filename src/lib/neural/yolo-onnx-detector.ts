/**
 * YOLO Object Detector via ONNX Runtime Web
 * Runs YOLOv8n locally in the browser (WASM/WebGL).
 * Model: YOLOv8n exported to ONNX (~6.3MB).
 */

import * as ort from "onnxruntime-web";

// ─── COCO 80 class names ───
const COCO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
  "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
  "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
  "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
  "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
  "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
  "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
  "hair drier", "toothbrush",
];

// ─── Category mapping for Portuguese ───
const CLASS_PT: Record<string, string> = {
  person: "pessoa", bicycle: "bicicleta", car: "carro", motorcycle: "motocicleta",
  airplane: "avião", bus: "ônibus", train: "trem", truck: "caminhão",
  boat: "barco", "traffic light": "semáforo", "fire hydrant": "hidrante",
  "stop sign": "placa de pare", "parking meter": "parquímetro", bench: "banco",
  bird: "pássaro", cat: "gato", dog: "cachorro", horse: "cavalo",
  sheep: "ovelha", cow: "vaca", elephant: "elefante", bear: "urso",
  zebra: "zebra", giraffe: "girafa", backpack: "mochila", umbrella: "guarda-chuva",
  handbag: "bolsa", tie: "gravata", suitcase: "mala", frisbee: "frisbee",
  skis: "esquis", snowboard: "snowboard", "sports ball": "bola",
  kite: "pipa", "baseball bat": "taco", "baseball glove": "luva",
  skateboard: "skate", surfboard: "prancha", "tennis racket": "raquete",
  bottle: "garrafa", "wine glass": "taça", cup: "caneca/copo",
  fork: "garfo", knife: "faca", spoon: "colher", bowl: "tigela",
  banana: "banana", apple: "maçã", sandwich: "sanduíche", orange: "laranja",
  broccoli: "brócolis", carrot: "cenoura", "hot dog": "cachorro-quente",
  pizza: "pizza", donut: "rosquinha", cake: "bolo", chair: "cadeira",
  couch: "sofá", "potted plant": "planta", bed: "cama",
  "dining table": "mesa", toilet: "vaso sanitário", tv: "TV",
  laptop: "notebook", mouse: "mouse", remote: "controle remoto",
  keyboard: "teclado", "cell phone": "celular", microwave: "micro-ondas",
  oven: "forno", toaster: "torradeira", sink: "pia",
  refrigerator: "geladeira", book: "livro", clock: "relógio",
  vase: "vaso", scissors: "tesoura", "teddy bear": "urso de pelúcia",
  "hair drier": "secador", toothbrush: "escova de dentes",
};

export interface YOLODetection {
  name: string;
  namePt: string;
  classId: number;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  nx: number;
  ny: number;
  nw: number;
  nh: number;
}

// ─── Singleton ───
let session: ort.InferenceSession | null = null;
let loadPromise: Promise<void> | null = null;
let isLoaded = false;

// YOLOv8n ONNX model URL — hosted publicly
const YOLO_MODEL_URL = "https://media.roboflow.com/onnx/yolov8n.onnx";
const INPUT_SIZE = 640;

async function loadModel(): Promise<void> {
  if (isLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      console.log("[YOLO-ONNX] Loading YOLOv8n model...");

      // Configure ONNX Runtime for browser
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

      session = await ort.InferenceSession.create(YOLO_MODEL_URL, {
        executionProviders: ["webgl", "wasm"],
        graphOptimizationLevel: "all",
      });

      isLoaded = true;
      console.log("[YOLO-ONNX] Model loaded successfully");
    } catch (e) {
      console.error("[YOLO-ONNX] Model load failed:", e);
      loadPromise = null;
      throw e;
    }
  })();

  return loadPromise;
}

/**
 * Preprocess video frame for YOLOv8: resize to 640x640, normalize to [0,1], NCHW format.
 */
function preprocessFrame(
  video: HTMLVideoElement | HTMLCanvasElement
): { tensor: ort.Tensor; scaleX: number; scaleY: number } {
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d")!;

  const vw = (video as any).videoWidth || (video as any).width || INPUT_SIZE;
  const vh = (video as any).videoHeight || (video as any).height || INPUT_SIZE;

  // Letterbox resize maintaining aspect ratio
  const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
  const newW = Math.round(vw * scale);
  const newH = Math.round(vh * scale);
  const padX = (INPUT_SIZE - newW) / 2;
  const padY = (INPUT_SIZE - newH) / 2;

  ctx.fillStyle = "#808080"; // gray padding
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.drawImage(video, padX, padY, newW, newH);

  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = imageData;

  // Convert to NCHW float32 [1, 3, 640, 640] normalized to [0, 1]
  const float32 = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    float32[i] = data[idx] / 255; // R
    float32[pixelCount + i] = data[idx + 1] / 255; // G
    float32[2 * pixelCount + i] = data[idx + 2] / 255; // B
  }

  return {
    tensor: new ort.Tensor("float32", float32, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    scaleX: vw / newW,
    scaleY: vh / newH,
  };
}

/**
 * Non-Maximum Suppression
 */
function nms(
  boxes: YOLODetection[],
  iouThreshold: number = 0.45
): YOLODetection[] {
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const kept: YOLODetection[] = [];

  for (const box of sorted) {
    let dominated = false;
    for (const kept_box of kept) {
      const iou = computeIoU(box, kept_box);
      if (iou > iouThreshold) {
        dominated = true;
        break;
      }
    }
    if (!dominated) kept.push(box);
  }
  return kept;
}

function computeIoU(a: YOLODetection, b: YOLODetection): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  return intersection / (areaA + areaB - intersection + 1e-6);
}

/**
 * Run YOLOv8n inference on a video frame.
 * Returns detected objects with COCO labels.
 */
export async function detectWithYOLO(
  video: HTMLVideoElement | HTMLCanvasElement,
  confThreshold: number = 0.35
): Promise<YOLODetection[]> {
  await loadModel();
  if (!session) return [];

  try {
    const { tensor, scaleX, scaleY } = preprocessFrame(video);
    const feeds: Record<string, ort.Tensor> = {};

    // YOLOv8 input name is typically "images"
    const inputName = session.inputNames[0];
    feeds[inputName] = tensor;

    const results = await session.run(feeds);
    const output = results[session.outputNames[0]];
    const outputData = output.data as Float32Array;

    // YOLOv8 output shape: [1, 84, 8400] (4 bbox + 80 classes, 8400 predictions)
    const numDetections = output.dims[2]; // 8400
    const numClasses = 80;
    const detections: YOLODetection[] = [];

    const vw = (video as any).videoWidth || (video as any).width || INPUT_SIZE;
    const vh = (video as any).videoHeight || (video as any).height || INPUT_SIZE;

    // Letterbox padding: scale factor determines newW/newH, pad fills the rest
    const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh);
    const newW = Math.round(vw * scale);
    const newH = Math.round(vh * scale);
    const padX = (INPUT_SIZE - newW) / 2;
    const padY = (INPUT_SIZE - newH) / 2;

    for (let i = 0; i < numDetections; i++) {
      // Find max class score
      let maxScore = 0;
      let maxClassId = 0;
      for (let c = 0; c < numClasses; c++) {
        const score = outputData[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }

      if (maxScore < confThreshold) continue;

      // YOLO outputs center x, center y, width, height
      const cx = outputData[0 * numDetections + i];
      const cy = outputData[1 * numDetections + i];
      const w = outputData[2 * numDetections + i];
      const h = outputData[3 * numDetections + i];

      // Convert from letterboxed coords back to original image space
      // 1) Remove padding offset, 2) Divide by scale to get original coords
      const x = ((cx - w / 2) - padX) / scale;
      const y = ((cy - h / 2) - padY) / scale;
      const bw = w / scale;
      const bh = h / scale;

      const className = COCO_CLASSES[maxClassId] || "unknown";
      detections.push({
        name: className,
        namePt: CLASS_PT[className] || className,
        classId: maxClassId,
        confidence: Math.round(maxScore * 100) / 100,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: bw,
        height: bh,
        nx: (x / vw) * 2 - 1,
        ny: -((y / vh) * 2 - 1),
        nw: (bw / vw) * 2,
        nh: (bh / vh) * 2,
      });
    }

    return nms(detections);
  } catch (e) {
    console.warn("[YOLO-ONNX] Inference error:", e);
    return [];
  }
}

/** Pre-warm YOLO model */
export function preloadYOLO(): Promise<void> {
  return loadModel();
}

/** Check if YOLO model is loaded */
export function isYOLOReady(): boolean {
  return isLoaded;
}
