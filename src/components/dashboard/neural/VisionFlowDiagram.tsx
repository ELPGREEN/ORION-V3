import React from 'react';
import { ReactFlow, Background, Controls, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Camera, Layers, Target, Eye, Maximize } from 'lucide-react';

const initialNodes = [
  {
    id: 'cam',
    position: { x: 0, y: 0 },
    data: { label: (
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-cyan-400" />
        <span>Raw Frames</span>
      </div>
    ) },
    type: 'input',
    className: 'bg-slate-900 border-cyan-500/50 text-white rounded-lg p-2'
  },
  {
    id: 'pre',
    position: { x: 0, y: 100 },
    data: { label: (
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-400" />
        <span>Tensor Preprocessing</span>
      </div>
    ) },
    className: 'bg-slate-900 border-blue-500/50 text-white rounded-lg p-2'
  },
  {
    id: 'yolo',
    position: { x: -120, y: 200 },
    data: { label: (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-red-400" />
          <span>YOLOv8 ObjDet</span>
        </div>
        <div className="text-[10px] text-slate-400">98.2% Confidence</div>
      </div>
    ) },
    className: 'bg-slate-900 border-red-500/50 text-white rounded-lg p-2'
  },
  {
    id: 'ocr',
    position: { x: 120, y: 200 },
    data: { label: (
      <div className="flex items-center gap-2">
        <Maximize className="w-4 h-4 text-yellow-400" />
        <span>OCR Engine</span>
      </div>
    ) },
    className: 'bg-slate-900 border-yellow-500/50 text-white rounded-lg p-2'
  },
  {
    id: 'fusion',
    position: { x: 0, y: 300 },
    data: { label: (
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-emerald-400" />
        <span>Scene Fusion</span>
      </div>
    ) },
    type: 'output',
    className: 'bg-slate-900 border-emerald-500/50 text-white rounded-lg p-2'
  },
];

const initialEdges = [
  { id: 'e1', source: 'cam', target: 'pre', animated: true },
  { id: 'e2', source: 'pre', target: 'yolo', style: { stroke: '#ef4444' } },
  { id: 'e3', source: 'pre', target: 'ocr', style: { stroke: '#eab308' } },
  { id: 'e4', source: 'yolo', target: 'fusion', animated: true },
  { id: 'e5', source: 'ocr', target: 'fusion', animated: true },
];

export function VisionFlowDiagram() {
  return (
    <Card className="w-full h-[400px] bg-black/40 border-primary/20 relative overflow-hidden">
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView colorMode="dark">
        <Background />
        <Controls />
        <Panel position="bottom-left" className="text-[10px] text-slate-500 p-2">
          Real-time Vision Pipeline Active
        </Panel>
      </ReactFlow>
    </Card>
  );
}

export default VisionFlowDiagram;
