import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: 'root', position: { x: 200, y: 0 }, data: { label: 'User Command' }, type: 'input' },
  { id: 'bolt', position: { x: 0, y: 100 }, data: { label: 'Bolt (Coding)' } },
  { id: 'palette', position: { x: 200, y: 100 }, data: { label: 'Palette (UI)' } },
  { id: 'harvester', position: { x: 400, y: 100 }, data: { label: 'Harvester (RAG)' } },
  { id: 'mcts', position: { x: 200, y: 200 }, data: { label: 'MCTS Planner' } },
  { id: 'action', position: { x: 200, y: 300 }, data: { label: 'Final Execution' }, type: 'output' },
];

const initialEdges = [
  { id: 'e1', source: 'root', target: 'bolt' },
  { id: 'e2', source: 'root', target: 'palette' },
  { id: 'e3', source: 'root', target: 'harvester' },
  { id: 'e4', source: 'bolt', target: 'mcts' },
  { id: 'e5', source: 'palette', target: 'mcts' },
  { id: 'e6', source: 'harvester', target: 'mcts' },
  { id: 'e7', source: 'mcts', target: 'action' },
];

export function AgentDecisionGraph() {
  return (
    <div style={{ width: '100%', height: '400px' }} className="border rounded-lg bg-black/20">
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default AgentDecisionGraph;
