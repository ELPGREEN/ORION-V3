import React from 'react';
import { Card } from '@/components/ui/card';

/**
 * Neural Pipeline Flow - Visual tracking of the P-C-R-A cycle.
 */
export function NeuralPipelineFlow() {
  return (
    <Card className="p-6 bg-black/40 border-primary/20">
      <div className="flex flex-col items-center justify-center space-y-4">
        <h3 className="text-lg font-semibold text-primary">Neural Pipeline Integrity</h3>
        <div className="flex items-center space-x-8">
          <div className="p-4 border border-primary/40 rounded-full">Perception</div>
          <div className="text-2xl">→</div>
          <div className="p-4 border border-primary/40 rounded-full">Cognition</div>
          <div className="text-2xl">→</div>
          <div className="p-4 border border-primary/40 rounded-full">Reasoning</div>
          <div className="text-2xl">→</div>
          <div className="p-4 border border-primary/40 rounded-full">Action</div>
        </div>
        <p className="text-sm text-muted-foreground italic">
          High-performance P-C-R-A flow active. Vision pipeline latency monitored.
        </p>
      </div>
    </Card>
  );
}

export default NeuralPipelineFlow;
