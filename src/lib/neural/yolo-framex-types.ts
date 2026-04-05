/**
 * ═══ YOLOFrameX Types ═══
 * Multi-task vision types: Objects, Faces, Scene, OCR, Movement
 * Integrated with Orion's existing MediaPipe + YOLO pipeline
 */

// ═══ Object Classification ═══

export type ObjectClass =
  // COCO 80 classes
  | 'person' | 'bicycle' | 'car' | 'motorcycle' | 'airplane' | 'bus' | 'train' | 'truck' | 'boat'
  | 'traffic light' | 'fire hydrant' | 'stop sign' | 'parking meter' | 'bench' | 'bird' | 'cat'
  | 'dog' | 'horse' | 'sheep' | 'cow' | 'elephant' | 'bear' | 'zebra' | 'giraffe' | 'backpack'
  | 'umbrella' | 'handbag' | 'tie' | 'suitcase' | 'frisbee' | 'skis' | 'snowboard' | 'sports ball'
  | 'kite' | 'baseball bat' | 'baseball glove' | 'skateboard' | 'surfboard' | 'tennis racket'
  | 'bottle' | 'wine glass' | 'cup' | 'fork' | 'knife' | 'spoon' | 'bowl' | 'banana' | 'apple'
  | 'sandwich' | 'orange' | 'broccoli' | 'carrot' | 'hot dog' | 'pizza' | 'donut' | 'cake'
  | 'chair' | 'couch' | 'potted plant' | 'bed' | 'dining table' | 'toilet' | 'tv' | 'laptop'
  | 'mouse' | 'remote' | 'keyboard' | 'cell phone' | 'microwave' | 'oven' | 'toaster' | 'sink'
  | 'refrigerator' | 'book' | 'clock' | 'vase' | 'scissors' | 'teddy bear' | 'hair drier' | 'toothbrush'
  // Custom extensions
  | 'face' | 'eye' | 'mouth' | 'hand' | 'text' | 'logo' | 'vehicle-plate' | 'document' | 'product'
  | 'sign' | 'road-marking' | 'furniture' | 'electronic-device' | 'food-item' | 'unknown';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface DetectedObject {
  id: string;
  class: ObjectClass;
  score: number;
  box: BoundingBox;
  velocity?: { x: number; y: number };
  direction?: ObjectDirection;
  isMoving: boolean;
  ocrText?: string;
  lipMovement?: string;
  timestamp: number;
}

export type ObjectDirection = 'parado' | 'esquerda' | 'direita' | 'cima' | 'baixo' | 'aproximando';

// ═══ Face Detection ═══

export interface FaceDetection {
  id: string;
  box: BoundingBox;
  landmarks?: FaceLandmarks;
  expression: FaceExpression;
  lipMovement: LipMovement;
  gazeDirection: GazeDirection;
  age?: number;
  gender?: 'male' | 'female' | 'unknown';
}

export interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  mouthLeft: { x: number; y: number };
  mouthRight: { x: number; y: number };
  mouthTop?: { x: number; y: number };
  mouthBottom?: { x: number; y: number };
}

export type FaceExpression = 'neutro' | 'sorrindo' | 'sério' | 'surpreso' | 'triste' | 'irritado' | 'pensativo';
export type LipMovement = 'falando' | 'silencioso' | 'sorrindo' | 'neutro';
export type GazeDirection = 'camera' | 'esquerda' | 'direita' | 'cima' | 'baixo' | 'documento' | 'desconhecido';

// ═══ Scene Classification ═══

export interface SceneClassification {
  label: SceneLabel;
  confidence: number;
  lighting: 'dia' | 'noite' | 'artificial' | 'misto';
  isIndoor: boolean;
}

export type SceneLabel =
  | 'sala' | 'escritório' | 'quarto' | 'cozinha' | 'banheiro'
  | 'rua' | 'estrada' | 'parque' | 'praia'
  | 'veículo' | 'loja' | 'restaurante'
  | 'natureza' | 'academia' | 'escola'
  | 'outro';

// ═══ Reading / OCR ═══

export interface ReadingResult {
  text: string[];
  lipMovement: LipMovement | null;
  expression: FaceExpression;
  textRegions: TextRegionResult[];
}

export interface TextRegionResult {
  text: string;
  box: BoundingBox;
  language?: string;
  confidence: number;
}

// ═══ Movement Analysis ═══

export interface MovementAnalysis {
  trackingIds: string[];
  objectsInMotion: TrackedMotion[];
  globalMotion: {
    intensity: number; // 0-1
    dominant: ObjectDirection;
  };
}

export interface TrackedMotion {
  id: string;
  velocity: { x: number; y: number };
  direction: ObjectDirection;
  speed: number; // pixels/frame
}

// ═══ Multi-Task Result (unified output) ═══

export interface MultiTaskResult {
  scenario: SceneClassification;
  objects: DetectedObject[];
  faces: FaceDetection[];
  reading: ReadingResult;
  movement: MovementAnalysis;
  timestamp: number;
  adaptiveSize: number;
  cacheHit: boolean;
  inferenceMs: number;
  sources: {
    mediapipe: boolean;
    yolo: boolean;
    ocr: boolean;
  };
}
