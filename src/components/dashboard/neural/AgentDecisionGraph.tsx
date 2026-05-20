import React from 'react';
import { ReactFlow, Background, Controls, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Brain, Search, Play, CheckCircle2 } from 'lucide-react';

const initialNodes = [
  {
    id: 'input',
    position: { x: 250, y: 0 },
    data: { label: (
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-blue-400" />
        <span>User Intent</span>
      </div>
    ) },
    type: 'input',
    className: 'bg-slate-900 border-blue-500/50 text-white rounded-lg p-2 min-w-[150px]'
  },
  {
    id: 'mcts',
    position: { x: 250, y: 100 },
    data: { label: (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 font-bold">
          <Brain className="w-4 h-4 text-purple-400" />
          <span>MCTS Search</span>
        </div>
        <div className="text-[10px] text-slate-400">Simulating 1,000 paths...</div>
      </div>
    ) },
    className: 'bg-slate-900 border-purple-500/50 text-white rounded-lg p-2 min-w-[180px]'
  },
  {
    id: 'planner',
    position: { x: 250, y: 200 },
    data: { label: (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 font-bold">
          <Play className="w-4 h-4 text-green-400" />
          <span>Action Planner</span>
        </div>
        <div className="text-[10px] text-slate-400">Optimizing trajectory</div>
      </div>
    ) },
    className: 'bg-slate-900 border-green-500/50 text-white rounded-lg p-2 min-w-[180px]'
  },
  {
    id: 'exec',
    position: { x: 250, y: 300 },
    data: { label: (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span>Final Execution</span>
      </div>
    ) },
    type: 'output',
    className: 'bg-slate-900 border-emerald-500/50 text-white rounded-lg p-2 min-w-[150px]'
  },
];

const initialEdges = [
  { id: 'e-in-mcts', source: 'input', target: 'mcts', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e-mcts-plan', source: 'mcts', target: 'planner', animated: true, style: { stroke: '#a855f7' } },
  { id: 'e-plan-exec', source: 'planner', target: 'exec', animated: true, style: { stroke: '#22c55e' } },
];

export function AgentDecisionGraph() {
  return (
    <Card className="w-full h-[450px] bg-black/40 border-primary/20 relative overflow-hidden">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        fitView
        colorMode="dark"
      >
        <Background color="#333" gap={16} />
        <Controls />
        <Panel position="top-right" className="bg-black/60 p-2 rounded border border-white/10 text-[10px] text-slate-400 backdrop-blur-md">
          Orion Decision Engine v25.0
        </Panel>
      </ReactFlow>
    </Card>
  );
}

export default AgentDecisionGraph;
