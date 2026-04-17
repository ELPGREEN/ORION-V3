import { useState, useRef } from "react";

export interface MotionData {
  intensity: number;
  direction: string;
  zones: boolean[];
  vectors: unknown[];
}

export interface Region {
  id: string;
  category: "object" | "face" | "hand" | "text" | "other";
  label: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
}

export function useVisionState() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [motion, setMotion] = useState<MotionData>({
    intensity: 0,
    direction: "●",
    zones: Array(9).fill(false),
    vectors: []
  });
  const [awareness, setAwareness] = useState(15);
  const [fps, setFps] = useState(0);
  const [mlDetections, setMlDetections] = useState<unknown[]>([]);

  const mlDetectionsRef = useRef<unknown[]>([]);
  const fpsC = useRef(0);
  const lastFpsT = useRef(Date.now());

  return {
    regions, setRegions,
    motion, setMotion,
    awareness, setAwareness,
    fps, setFps,
    mlDetections, setMlDetections,
    mlDetectionsRef,
    fpsC,
    lastFpsT
  };
}
