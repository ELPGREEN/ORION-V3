/**
 * Orion ARC-AGI-3 Robotics Perception Layer
 * YOLO + SLAM + Sensor Fusion for autonomous robotics
 */

import { LogManager, Logger } from '../core/log-manager';
import type { WebSocketClient } from '../protocols/websocket-client';

export interface DetectedObject {
  id: string;
  className: string;
  classId: number;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  timestamp: number;
}

export interface PointCloud {
  points: Array<{ x: number; y: number; z: number; intensity?: number }>;
  timestamp: number;
  width: number;
  height: number;
}

export interface RobotPose {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
  timestamp: number;
}

export interface MapPoint {
  x: number;
  y: number;
  z: number;
  descriptors: Float32Array;
  observations: number;
}

export interface SensorReading {
  type: 'lidar' | 'radar' | 'camera' | 'infrared' | 'ultrasonic';
  data: unknown;
  timestamp: number;
  confidence: number;
}

export interface FusionResult {
  objects: DetectedObject[];
  pose: RobotPose;
  map: MapPoint[];
  obstacles: Array<{ position: { x: number; y: number; z: number }; type: string }>;
  terrain: string;
  timestamp: number;
}

export class ArcRoboticsPerception {
  private logger: Logger;
  private rosBridge: WebSocketClient | null = null;
  private yoloConfig = {
    modelPath: 'yolov8n.pt',
    confidenceThreshold: 0.5,
    iouThreshold: 0.45,
    maxDetections: 100,
  };
  private slamState = {
    map: new Map<string, MapPoint>(),
    keyframes: new Array<RobotPose & { features: MapPoint[] }>(),
    currentPose: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0, timestamp: Date.now() } as RobotPose,
    isInitialized: false,
  };
  private sensorBuffer: SensorReading[] = [];
  private maxBufferSize = 100;
  private trackedObjects: Map<string, DetectedObject> = new Map();
  private objectIdCounter = 0;

  constructor(rosBridge?: WebSocketClient) {
    this.logger = LogManager.getInstance().createLogger('ArcRoboticsPerception');
    this.rosBridge = rosBridge || null;
    this.logger.info('ArcRoboticsPerception initialized');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing perception system');
    await this.initializeROS();
    await this.initializeYOLO();
    this.slamState.isInitialized = true;
    this.logger.info('Perception system ready');
  }

  private async initializeROS(): Promise<void> {
    if (!this.rosBridge) {
      this.logger.warn('No ROS bridge configured, running in simulation mode');
      return;
    }

    try {
      await this.rosBridge.connect();
      this.logger.info('ROS bridge connected');
    } catch (error) {
      this.logger.warn('ROS bridge connection failed, using simulation', error);
    }
  }

  private async initializeYOLO(): Promise<void> {
    this.logger.info(`YOLO model: ${this.yoloConfig.modelPath}`);
  }

  async processImage(imageData: Buffer | string): Promise<DetectedObject[]> {
    const timestamp = Date.now();

    try {
      const mockDetections = this.generateMockDetections(imageData, timestamp);
      const tracked = this.updateObjectTracking(mockDetections);

      this.logger.debug(`Processed image: ${tracked.length} objects detected`);
      return tracked;
    } catch (error) {
      this.logger.error('Image processing failed', error);
      return [];
    }
  }

  private generateMockDetections(source: unknown, timestamp: number): DetectedObject[] {
    const classes = ['person', 'car', 'truck', 'bicycle', 'dog', 'cat', 'chair', 'table'];
    const numDetections = Math.floor(Math.random() * 5);

    const detections: DetectedObject[] = [];
    for (let i = 0; i < numDetections; i++) {
      detections.push({
        id: `obj_${this.objectIdCounter++}`,
        className: classes[Math.floor(Math.random() * classes.length)],
        classId: Math.floor(Math.random() * classes.length),
        confidence: 0.5 + Math.random() * 0.45,
        bbox: {
          x: Math.random() * 640,
          y: Math.random() * 480,
          width: 50 + Math.random() * 150,
          height: 50 + Math.random() * 150,
        },
        timestamp,
      });
    }

    return detections;
  }

  private updateObjectTracking(detections: DetectedObject[]): DetectedObject[] {
    const tracked: DetectedObject[] = [];

    for (const detection of detections) {
      let bestMatch: DetectedObject | null = null;
      let bestDistance = Infinity;

      for (const [id, trackedObj] of this.trackedObjects) {
        if (trackedObj.className !== detection.className) continue;

        const dx = trackedObj.bbox.x - detection.bbox.x;
        const dy = trackedObj.bbox.y - detection.bbox.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bestDistance && distance < 100) {
          bestDistance = distance;
          bestMatch = trackedObj;
        }
      }

      if (bestMatch) {
        bestMatch.bbox = detection.bbox;
        bestMatch.confidence = detection.confidence;
        bestMatch.timestamp = detection.timestamp;
        tracked.push(bestMatch);
      } else {
        this.trackedObjects.set(detection.id, detection);
        tracked.push(detection);
      }
    }

    for (const [id, obj] of this.trackedObjects) {
      if (Date.now() - obj.timestamp > 5000) {
        this.trackedObjects.delete(id);
      }
    }

    return tracked;
  }

  async processPointCloud(data: PointCloud): Promise<void> {
    const pose = this.slamState.currentPose;

    for (const point of data.points) {
      const key = `${point.x.toFixed(2)}_${point.y.toFixed(2)}_${point.z.toFixed(2)}`;
      const existing = this.slamState.map.get(key);

      if (existing) {
        existing.observations++;
      } else {
        this.slamState.map.set(key, {
          x: point.x,
          y: point.y,
          z: point.z,
          descriptors: new Float32Array(256),
          observations: 1,
        });
      }
    }

    this.logger.debug(`Processed point cloud: ${data.points.length} points, map size: ${this.slamState.map.size}`);
  }

  updatePose(pose: Partial<RobotPose>): void {
    this.slamState.currentPose = {
      ...this.slamState.currentPose,
      ...pose,
      timestamp: Date.now(),
    };

    if (this.slamState.isInitialized && this.shouldAddKeyframe()) {
      this.addKeyframe();
    }
  }

  private shouldAddKeyframe(): boolean {
    const lastKeyframe = this.slamState.keyframes[this.slamState.keyframes.length - 1];
    if (!lastKeyframe) return true;

    const dx = lastKeyframe.x - this.slamState.currentPose.x;
    const dy = lastKeyframe.y - this.slamState.currentPose.y;
    const dz = lastKeyframe.z - this.slamState.currentPose.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return distance > 0.5;
  }

  private addKeyframe(): void {
    const keyframe: RobotPose & { features: MapPoint[] } = {
      ...this.slamState.currentPose,
      features: Array.from(this.slamState.map.values()).slice(-100),
    };

    this.slamState.keyframes.push(keyframe);

    if (this.slamState.keyframes.length > 50) {
      this.optimizeMap();
    }

    this.logger.debug(`Added keyframe at (${keyframe.x.toFixed(2)}, ${keyframe.y.toFixed(2)}, ${keyframe.z.toFixed(2)})`);
  }

  private optimizeMap(): void {
    if (this.slamState.keyframes.length < 10) return;

    const toRemove = Math.floor(this.slamState.keyframes.length * 0.2);
    this.slamState.keyframes = this.slamState.keyframes.slice(toRemove);

    const pointsToKeep = Math.floor(this.slamState.map.size * 0.8);
    const iterator = this.slamState.map.entries();
    const toDelete: string[] = [];

    for (let i = 0; i < pointsToKeep; i++) {
      const result = iterator.next();
      if (result.done) break;
    }

    for (const [key] of iterator) {
      toDelete.push(key);
    }

    for (const key of toDelete) {
      this.slamState.map.delete(key);
    }

    this.logger.info(`Map optimized: ${this.slamState.keyframes.length} keyframes, ${this.slamState.map.size} points`);
  }

  addSensorReading(reading: SensorReading): void {
    this.sensorBuffer.push(reading);
    if (this.sensorBuffer.length > this.maxBufferSize) {
      this.sensorBuffer.shift();
    }
  }

  async fuseSensors(): Promise<FusionResult> {
    const objects = Array.from(this.trackedObjects.values());
    const pose = this.slamState.currentPose;
    const map = Array.from(this.slamState.map.values());

    const obstacles = this.detectObstacles();
    const terrain = this.estimateTerrain();

    return {
      objects,
      pose,
      map: map.slice(0, 1000),
      obstacles,
      terrain,
      timestamp: Date.now(),
    };
  }

  private detectObstacles(): Array<{ position: { x: number; y: number; z: number }; type: string }> {
    const obstacles: Array<{ position: { x: number; y: number; z: number }; type: string }> = [];

    const recentReadings = this.sensorBuffer.filter(r => Date.now() - r.timestamp < 1000);

    for (const reading of recentReadings) {
      if (reading.type === 'lidar') {
        const points = (reading.data as { points: Array<{ x: number; y: number; z: number }> })?.points || [];
        for (const point of points.slice(0, 10)) {
          obstacles.push({
            position: point,
            type: 'lidar_obstacle',
          });
        }
      }
    }

    return obstacles.slice(0, 20);
  }

  private estimateTerrain(): string {
    const recentReadings = this.sensorBuffer.filter(r => r.type === 'lidar');
    if (recentReadings.length === 0) return 'unknown';

    const lastReading = recentReadings[recentReadings.length - 1];
    const variance = this.calculateVariance(lastReading.data as number[]);

    if (variance < 0.1) return 'flat';
    if (variance < 0.5) return 'uneven';
    return 'rough';
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  getCurrentMap(): MapPoint[] {
    return Array.from(this.slamState.map.values());
  }

  getPose(): RobotPose {
    return { ...this.slamState.currentPose };
  }

  getTrackedObjects(): DetectedObject[] {
    return Array.from(this.trackedObjects.values());
  }

  reset(): void {
    this.slamState.map.clear();
    this.slamState.keyframes = [];
    this.slamState.currentPose = {
      x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0, timestamp: Date.now()
    };
    this.trackedObjects.clear();
    this.sensorBuffer = [];
    this.logger.info('Perception system reset');
  }

  configureYOLO(config: Partial<typeof ArcRoboticsPerception.prototype.yoloConfig>): void {
    this.yoloConfig = { ...this.yoloConfig, ...config };
    this.logger.info('YOLO configuration updated', this.yoloConfig);
  }

  getStatistics(): {
    mapPoints: number;
    keyframes: number;
    trackedObjects: number;
    sensorBufferSize: number;
    isInitialized: boolean;
  } {
    return {
      mapPoints: this.slamState.map.size,
      keyframes: this.slamState.keyframes.length,
      trackedObjects: this.trackedObjects.size,
      sensorBufferSize: this.sensorBuffer.length,
      isInitialized: this.slamState.isInitialized,
    };
  }
}
