import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Camera Input' }, type: 'input' },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'Tensor Preprocessing' } },
  { id: '3', position: { x: -100, y: 200 }, data: { label: 'YOLO Detection' } },
  { id: '4', position: { x: 100, y: 200 }, data: { label: 'OCR Engine' } },
  { id: '5', position: { x: 0, y: 300 }, data: { label: 'Scene Fusion' }, type: 'output' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-5', source: '3', target: '5' },
  { id: 'e4-5', source: '4', target: '5' },
];

export function VisionFlowDiagram() {
  return (
    <div style={{ width: '100%', height: '400px' }} className="border rounded-lg bg-black/20">
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default VisionFlowDiagram;
