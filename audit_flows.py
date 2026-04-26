import os

expected_modules = {
    "tf-runtime.ts": "TF.js Runtime",
    "tf-addons.ts": "TF Addons",
    "tf-decision-forests.ts": "TF Decision Forests",
    "tf-gnn-nsl.ts": "TF GNN + NSL",
    "tf-probability-ranking.ts": "TF Probability + Ranking",
    "tf-text-ops.ts": "TF Text Ops",
    "tfm-vision-augment.ts": "TFM Vision Augment",
    "tfm-vision-models.ts": "TFM Vision Models",
    "tfm-vision-ops.ts": "TFM Vision Ops",
    "frame-tensor-preprocessing.ts": "Frame Tensor Preprocessing",
    "tf-responsible-ai-data.ts": "TF Responsible AI: Data",
    "tfx-pipeline-components.ts": "TFX Pipeline",
    "tf-mlops-pipeline.ts": "TF MLOps Pipeline",
    "tf-model-monitoring.ts": "TF Model Monitoring",
    "tf-inference-optimization.ts": "TF Inference Optimization",
    "tf-continuous-learning.ts": "TF Continuous Learning",
    "litert-compiled-model.ts": "LiteRT Compiled Model",
    "litert-conversion.ts": "LiteRT Conversion",
    "litert-lm.ts": "LiteRT-LM",
    "tf-fairness-privacy.ts": "Fairness + Privacy",
    "tf-responsible-ai-evaluation.ts": "Responsible AI: Evaluation",
    "tf-responsible-ai-training.ts": "Responsible AI: Training",
    "tf-explainability.ts": "TF Explainability",
    "tf-compression.ts": "TF Model Compression",
    "tf-data-validation.ts": "TF Data Validation",
    "tf-transform.ts": "TF Transform"
}

base_path = "src/lib/neural/"
missing = []

print("## Neural Module Audit (TensorFlow Ecosystem)")
for filename, desc in expected_modules.items():
    path = os.path.join(base_path, filename)
    if not os.path.exists(path):
        print(f"[MISSING] {filename} - {desc}")
        missing.append(filename)
    else:
        print(f"[PRESENT] {filename}")

print(f"\nTotal Missing: {len(missing)}/26")

print("\n## Visual Flow Audit (@xyflow/react)")
expected_diagrams = [
    "VisionFlowDiagram.tsx",
    "VoiceOrchestrationFlow.tsx",
    "AgentDecisionGraph.tsx",
    "NeuralPipelineFlow.tsx"
]
diag_path = "src/components/dashboard/neural/"
for diag in expected_diagrams:
    path = os.path.join(diag_path, diag)
    if not os.path.exists(path):
        print(f"[MISSING] {diag}")
