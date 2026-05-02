import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Audio Stream' }, type: 'input' },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'STT (Google/Deepgram)' } },
  { id: '3', position: { x: 0, y: 200 }, data: { label: 'Intent Classifier' } },
  { id: '4', position: { x: 0, y: 300 }, data: { label: 'Orion Logic' } },
  { id: '5', position: { x: 0, y: 400 }, data: { label: 'TTS (OpenAI/ElevenLabs)' }, type: 'output' },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e3-4', source: '3', target: '4' },
  { id: 'e4-5', source: '4', target: '5' },
];

export function VoiceOrchestrationFlow() {
  return (
    <div style={{ width: '100%', height: '500px' }} className="border rounded-lg bg-black/20">
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default VoiceOrchestrationFlow;
