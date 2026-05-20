/**
 * Neural Flow Analyzer - Orion Core
 * Autonomously detects architectural gaps and missing neural components.
 */

import { readProjectFile } from '../orion-evolution/project-file-reader';
import * as NeuralModules from './index';
import * as VisualFlows from '../../components/dashboard/neural';

export interface FlowGap {
  id: string;
  category: "neural_module" | "visual_flow" | "workflow";
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  expectedFile: string;
}

const EXPECTED_NEURAL_MODULES = [
  { file: "tfm-vision-augment.ts", desc: "Vision data augmentation for robust recognition", severity: "high" },
  { file: "tfm-vision-models.ts", desc: "Specialized computer vision backbone architectures", severity: "high" },
  { file: "tfm-vision-ops.ts", desc: "Low-level tensor operations for vision models", severity: "medium" },
  { file: "frame-tensor-preprocessing.ts", desc: "High-performance video frame to tensor pipeline", severity: "critical" },
  { file: "tf-explainability.ts", desc: "Interpretability layers for neural decisions", severity: "medium" },
  { file: "tf-compression.ts", desc: "Model quantization and pruning for mobile edge", severity: "high" },
  { file: "tf-data-validation.ts", desc: "Schema validation and anomaly detection for training data", severity: "medium" },
  { file: "tf-transform.ts", desc: "Feature engineering and transformation pipeline", severity: "medium" }
];

const EXPECTED_VISUAL_FLOWS = [
  { file: "src/components/dashboard/neural/VisionFlowDiagram.tsx", desc: "Visual tracking of vision processing nodes", severity: "medium" },
  { file: "src/components/dashboard/neural/VoiceOrchestrationFlow.tsx", desc: "STT/TTS/Intent orchestration diagram", severity: "medium" },
  { file: "src/components/dashboard/neural/AgentDecisionGraph.tsx", desc: "MCTS and Planner visualization", severity: "high" },
  { file: "src/components/dashboard/neural/NeuralPipelineFlow.tsx", desc: "End-to-end P-C-R-A flow visualization", severity: "high" }
];

/**
 * Analyzes the current repository state to find missing neural "flows".
 * Uses dual-layer verification: Direct File Access (Project File Reader)
 * and Runtime Registry Check (Barrel Exports).
 */
export async function analyzeNeuralFlowGaps(): Promise<FlowGap[]> {
  const gaps: FlowGap[] = [];

  // 1. Check Neural Modules
  for (const mod of EXPECTED_NEURAL_MODULES) {
    try {
      const path = `src/lib/neural/${mod.file}`;

      // Dual-check: 1) Physical file existence via bundler glob
      const fileExists = await readProjectFile(path);

      // 2) Registry check: Is it exported in the barrel file?
      // We strip .ts extension to match export names or sub-modules
      const exportName = mod.file.replace(/\.ts$/, '');
      const isExported = exportName in NeuralModules;

      if (!fileExists && !isExported) {
        gaps.push({
          id: mod.file,
          category: "neural_module",
          description: mod.desc,
          severity: mod.severity as any,
          expectedFile: path
        });
      }
    } catch (err) {
      console.warn(`[FlowAnalyzer] Error checking module ${mod.file}:`, err);
    }
  }

  // 2. Check Visual Flows
  for (const diag of EXPECTED_VISUAL_FLOWS) {
    try {
      const fileExists = await readProjectFile(diag.file);

      const componentName = diag.file.split('/').pop()?.replace(/\.tsx$/, '') || '';
      const isRegistered = componentName in VisualFlows;

      if (!fileExists && !isRegistered) {
        gaps.push({
          id: componentName || diag.file,
          category: "visual_flow",
          description: diag.desc,
          severity: diag.severity as any,
          expectedFile: diag.file
        });
      }
    } catch (err) {
      console.warn(`[FlowAnalyzer] Error checking visual flow ${diag.file}:`, err);
    }
  }

  return gaps;
}

/**
 * Generates a "Google-style" engineering report on architectural integrity.
 */
export function generateFlowReport(gaps: FlowGap[]): string {
  let report = "# ORION NEURAL FLOW - ARCHITECTURAL INTEGRITY REPORT\n\n";
  report += `Analyzed ${EXPECTED_NEURAL_MODULES.length + EXPECTED_VISUAL_FLOWS.length} critical flow components.\n`;
  report += `Detected Gaps: ${gaps.length}\n\n`;

  if (gaps.length === 0) {
    report += "✅ All critical neural flows are implemented and verified.\n";
    return report;
  }

  report += "## 1. Missing Neural Modules (TensorFlow Ecosystem)\n";
  const modGaps = gaps.filter(g => g.category === "neural_module");
  if (modGaps.length > 0) {
    modGaps.forEach(g => {
      report += `- [ ] **${g.id}**: ${g.description} (Severity: ${g.severity.toUpperCase()})\n`;
    });
  } else {
    report += "✅ All expected neural modules are present.\n";
  }

  report += "\n## 2. Missing Visual Observability Flows (@xyflow/react)\n";
  const visualGaps = gaps.filter(g => g.category === "visual_flow");
  if (visualGaps.length > 0) {
    visualGaps.forEach(g => {
      report += `- [ ] **${g.id}**: ${g.description} (Severity: ${g.severity.toUpperCase()})\n`;
    });
  } else {
    report += "✅ All expected visual flows are present.\n";
  }

  report += "\n## 3. Recommended Actions\n";
  if (gaps.some(g => g.id === "frame-tensor-preprocessing.ts")) {
    report += "1. Implement `frame-tensor-preprocessing.ts` to stabilize the computer vision loop.\n";
  }
  if (gaps.some(g => g.id === "AgentDecisionGraph.tsx")) {
    report += "2. Create `AgentDecisionGraph.tsx` to provide visual debugging for the reasoning engine.\n";
  }
  report += "3. Complete the TFX Pipeline integration for autonomous model retraining.\n";

  return report;
}
