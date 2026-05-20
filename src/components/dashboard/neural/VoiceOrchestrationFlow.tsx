import React from 'react';
import { ReactFlow, Background, Controls, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Mic, MessageSquare, Brain, Send, Volume2 } from 'lucide-react';

const initialNodes = [
  {
    id: 'mic',
    position: { x: 250, y: 0 },
    data: { label: (
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-rose-400" />
        <span>Audio Stream</span>
      </div>
    ) },
    type: 'input',
    className: 'bg-slate-900 border-rose-500/50 text-white rounded-lg p-2'
  },
  {
    id: 'stt',
    position: { x: 250, y: 100 },
    data: { label: (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span>STT Engine</span>
        </div>
        <div className="text-[10px] text-slate-400">Google Cloud / Deepgram</div>
      </div>
    ) },
    className: 'bg-slate-900 border-blue-500/50 text-white rounded-lg p-2'
  },
  {
    id: 'intent',
    position: { x: 250, y: 200 },
    data: { label: (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 font-bold">
          <Brain className="w-4 h-4 text-purple-400" />
          <span>Intent Classifier</span>
        </div>
        <div className="text-[10px] text-slate-400">Neural Logic Analysis</div>
      </div>
    ) },
    className: 'bg-slate-900 border-purple-500/50 text-white rounded-lg p-2'
  },
  {
    id: 'orion',
    position: { x: 250, y: 300 },
    data: { label: (
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-cyan-400" />
        <span>Orion Response</span>
      </div>
    ) },
    className: 'bg-slate-900 border-cyan-500/50 text-white rounded-lg p-2'
  },
  {
    id: 'tts',
    position: { x: 250, y: 400 },
    data: { label: (
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-emerald-400" />
        <span>TTS Synthesis</span>
      </div>
    ) },
    type: 'output',
    className: 'bg-slate-900 border-emerald-500/50 text-white rounded-lg p-2'
  },
];

const initialEdges = [
  { id: 'e1', source: 'mic', target: 'stt', animated: true, style: { stroke: '#fb7185' } },
  { id: 'e2', source: 'stt', target: 'intent', animated: true },
  { id: 'e3', source: 'intent', target: 'orion' },
  { id: 'e4', source: 'orion', target: 'tts', animated: true, style: { stroke: '#10b981' } },
];

export function VoiceOrchestrationFlow() {
  return (
    <Card className="w-full h-[500px] bg-black/40 border-primary/20 relative overflow-hidden">
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView colorMode="dark">
        <Background gap={20} color="#222" />
        <Controls />
        <Panel position="top-left" className="bg-black/40 p-2 rounded text-xs text-rose-400 font-mono">
          VOICE_STREAM_ACTIVE
        </Panel>
      </ReactFlow>
    </Card>
  );
}

export default VoiceOrchestrationFlow;
