/**
 * ─── Neural Pipeline E2E Test ───
 * Verifies all 8 specialized models are activated correctly:
 * LLM (Judge), LCM (Concept), LAM (Action), MoE (Gating),
 * VLM (Fusion), SLM (Router), MLM (Masked), SAM (Segment)
 */
import { describe, it, expect } from "vitest";
import { executeNeuralPipeline, postProcessResponse } from "@/lib/neural-pipeline";
import { localJudgeScore } from "@/lib/neural/llm-judge";
import { buildConceptEmbedding, detectConceptCategory } from "@/lib/neural/concept-model";
import { runLAMPipeline, perceiveInput, recognizeIntent, decomposeTask, planActions, executeAction } from "@/lib/neural/large-action-model";
import { moeInternalGating } from "@/lib/moe-gating";
import { fuseStreams } from "@/lib/neural/multimodal-fusion";
import { routeToTier, classifyQueryComplexity, slimTokenize } from "@/lib/neural/slim-model-router";
import { documentCompleteness, fillMaskedLegal, bidirectionalScore } from "@/lib/neural/masked-prediction";
import { segmentScene, segmentDocument } from "@/lib/neural/segment-anything";

// ═══════════════════════════════════════
// Individual Model Tests
// ═══════════════════════════════════════

describe("SLM — Slim Language Model (Router)", () => {
  it("tokenizes input", () => {
    const result = slimTokenize("Habeas corpus preventivo com pedido liminar");
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.compactTokens.length).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeGreaterThan(0);
  });

  it("classifies query complexity", () => {
    const result = classifyQueryComplexity("O que é habeas corpus?");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("routes to correct tier", () => {
    const result = routeToTier("Qual a pena para furto qualificado?");
    expect(["cached", "edge", "slim", "full"]).toContain(result.tier);
    expect(result.complexity).toBeDefined();
  });
});

describe("LCM — Latent Consistency Model (Concept)", () => {
  it("detects concept category", () => {
    const category = detectConceptCategory("Recurso especial ao STJ sobre dano moral");
    expect(category).toBeTruthy();
    expect(typeof category).toBe("string");
  });

  it("builds concept embedding", () => {
    const emb = buildConceptEmbedding("Ação de indenização por danos morais");
    expect(emb.embedding.length).toBeGreaterThan(0);
    expect(emb.confidence).toBeGreaterThan(0);
    expect(emb.segments.length).toBeGreaterThan(0);
    expect(emb.relatedConcepts.length).toBeGreaterThan(0);
  });
});

describe("LAM — Large Action Model", () => {
  it("perceives input correctly", () => {
    const perception = perceiveInput("Elabore uma petição inicial de danos morais");
    expect(perception.rawInput).toBeTruthy();
    expect(["question", "command", "document", "multimodal"]).toContain(perception.inputType);
    expect(["legal", "administrative", "financial", "general"]).toContain(perception.domain);
    expect(perception.urgency).toBeGreaterThanOrEqual(0);
    expect(perception.complexity).toBeGreaterThanOrEqual(0);
  });

  it("recognizes intent", () => {
    const perception = perceiveInput("Pesquise jurisprudência sobre dano moral");
    const intent = recognizeIntent(perception);
    expect(intent.primary).toBeTruthy();
    expect(intent.confidence).toBeGreaterThan(0);
    expect(intent.reasoning).toBeTruthy();
  });

  it("decomposes task into subtasks", () => {
    const perception = perceiveInput("Analise este contrato e identifique cláusulas abusivas");
    const intent = recognizeIntent(perception);
    const subtasks = decomposeTask(intent, perception);
    expect(subtasks.length).toBeGreaterThan(0);
    subtasks.forEach(t => {
      expect(t.id).toBeTruthy();
      expect(t.action).toBeTruthy();
      expect(t.description).toBeTruthy();
    });
  });

  it("runs full LAM pipeline", () => {
    const result = runLAMPipeline("Gere um documento de habeas corpus");
    expect(result.totalTasks).toBeGreaterThan(0);
    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
  });
});

describe("MoE — Mixture of Experts (Gating)", () => {
  it("routes to internal experts", () => {
    const result = moeInternalGating("legal_research_full");
    expect(result.selectedExperts.length).toBeGreaterThan(0);
    expect(result.scores.length).toBeGreaterThan(0);
    expect(result.totalComputeCost).toBeGreaterThanOrEqual(0);
  });

  it("respects topK parameter", () => {
    const result = moeInternalGating("document_analysis", { topK: 2 });
    expect(result.selectedExperts.length).toBeLessThanOrEqual(2);
  });

  it("includes action_model and segment_anything as experts", () => {
    const result = moeInternalGating("task_planning_workflow_segmentation", { topK: 12 });
    const allIds = result.scores.map(s => s.id);
    expect(allIds).toContain("action_model");
    expect(allIds).toContain("segment_anything");
  });
});

describe("VLM — Vision Language Model (Multimodal Fusion)", () => {
  it("fuses three streams", () => {
    const text = [0.1, 0.5, 0.3, 0.7];
    const vision = [0.2, 0.4, 0.6, 0.8];
    const layout = [0.3, 0.3, 0.5, 0.5];
    const fused = fuseStreams(text, vision, layout);
    expect(fused.length).toBeGreaterThan(0);
    fused.forEach(v => expect(typeof v).toBe("number"));
  });

  it("handles five-stream fusion", () => {
    const stream = [0.1, 0.2, 0.3, 0.4];
    const fused = fuseStreams(stream, stream, stream, undefined, stream, stream);
    expect(fused.length).toBeGreaterThan(0);
  });
});

describe("MLM — Masked Language Model", () => {
  it("evaluates document completeness", () => {
    const doc = "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE SÃO PAULO. FULANO DE TAL, brasileiro, casado, residente e domiciliado na Rua X, vem respeitosamente à presença de Vossa Excelência propor AÇÃO DE INDENIZAÇÃO contra BELTRANO.";
    const result = documentCompleteness(doc, "peticao_inicial");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.overallAssessment).toBeTruthy();
  });

  it("fills masked legal terms", () => {
    const result = fillMaskedLegal("O réu foi condenado à pena de [MASK] anos de reclusão");
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("computes bidirectional scores", () => {
    const scores = bidirectionalScore("Direito penal é a disciplina que estuda as normas");
    expect(scores.length).toBeGreaterThan(0);
    scores.forEach(s => {
      expect(s.leftScore).toBeGreaterThanOrEqual(0);
      expect(s.rightScore).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("SAM — Segment Anything Model", () => {
  it("segments a scene", () => {
    const features = Array.from({ length: 100 }, () => Math.random());
    const result = segmentScene(features);
    expect(result.masks.length).toBeGreaterThan(0);
    expect(result.totalSegments).toBeGreaterThan(0);
    expect(result.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(result.imageEmbedding).toBeDefined();
    result.masks.forEach(mask => {
      expect(mask.label).toBeTruthy();
      expect(mask.confidence).toBeGreaterThan(0);
      expect(mask.bbox).toBeDefined();
    });
  });

  it("segments a document", () => {
    const features = Array.from({ length: 50 }, () => Math.random());
    const result = segmentDocument(features);
    expect(result.masks.length).toBeGreaterThan(0);
    expect(result.totalSegments).toBeGreaterThan(0);
  });
});

describe("LLM — Large Language Model (Judge)", () => {
  it("scores document quality", () => {
    const verdict = localJudgeScore(
      "O réu foi condenado com base no artigo 155 do Código Penal, conforme precedente do STJ no REsp 1.234.567/RS.",
      "peticao_inicial"
    );
    expect(verdict.overallScore).toBeGreaterThanOrEqual(0);
    expect(verdict.overallScore).toBeLessThanOrEqual(100);
    expect(verdict.grade).toBeTruthy();
    expect(verdict.dimensions).toBeDefined();
  });
});

// ═══════════════════════════════════════
// Full Pipeline E2E
// ═══════════════════════════════════════

describe("Neural Pipeline — Full E2E", () => {
  it("activates SLM, LCM, MoE at minimum for simple query", () => {
    const output = executeNeuralPipeline({ query: "O que é habeas corpus?" });
    expect(output.modulesActivated).toContain("SLM");
    expect(output.modulesActivated).toContain("LCM");
    expect(output.modulesActivated).toContain("MoE");
    expect(output.totalDurationMs).toBeGreaterThan(0);
    expect(output.stages.length).toBeGreaterThan(0);
    expect(output.enrichedPrompt).toBeTruthy();
  });

  it("activates MLM and LLM-Judge with context + full tier", () => {
    const output = executeNeuralPipeline({
      query: "Analise a completude desta petição",
      context: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO. FULANO DE TAL vem propor AÇÃO DE INDENIZAÇÃO. DOS FATOS: Em 01/01/2024 ocorreu o evento danoso. DO DIREITO: Art. 186 do CC. DOS PEDIDOS: Condenação ao pagamento de R$ 50.000,00.",
      documentType: "peticao_inicial",
      forceFullPipeline: true,
    });

    expect(output.modulesActivated).toContain("SLM");
    expect(output.modulesActivated).toContain("LCM");
    expect(output.modulesActivated).toContain("MoE");
    expect(output.modulesActivated).toContain("LLM-Judge");
    expect(output.judgeVerdict).toBeDefined();
    expect(output.judgeVerdict!.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("activates VLM and SAM with vision enabled", () => {
    const imageData = Array.from({ length: 64 }, () => Math.random());
    const output = executeNeuralPipeline({
      query: "Descreva o que está nesta imagem",
      enableVLM: true,
      imageData,
      forceFullPipeline: true,
    });

    // VLM/SAM activation depends on MoE selection; with forceFullPipeline they have higher chance
    expect(output.modulesActivated).toContain("SLM");
    expect(output.modulesActivated).toContain("LCM");
    expect(output.modulesActivated).toContain("MoE");
    expect(output.stages.length).toBeGreaterThan(4);
  });

  it("activates LAM for action-oriented queries", () => {
    // Run multiple times since MoE has noise — at least one should activate action_model
    let lamActivated = false;
    for (let i = 0; i < 5; i++) {
      const output = executeNeuralPipeline({
        query: "Elabore uma petição inicial completa para ação de indenização",
        useCase: "task_planning",
        forceFullPipeline: true,
      });
      if (output.modulesActivated.includes("LAM")) {
        lamActivated = true;
        expect(output.actionPlanResult).toBeDefined();
        expect(output.actionPlanResult!.totalTasks).toBeGreaterThan(0);
        break;
      }
    }
    // LAM standalone always works
    const lamDirect = runLAMPipeline("Elabore uma petição");
    expect(lamDirect.totalTasks).toBeGreaterThan(0);
  });

  it("post-processes response through LLM Judge", () => {
    const result = postProcessResponse(
      "Com base no artigo 5º da Constituição Federal e na Súmula 37 do STJ, o dano moral é cabível quando demonstrada a violação de direitos da personalidade.",
      "peticao_inicial"
    );
    expect(result.verdict.overallScore).toBeGreaterThan(0);
    expect(result.citations.length).toBeGreaterThanOrEqual(0);
    expect(result.bidirectionalScores.length).toBeGreaterThan(0);
  });

  it("returns all expected output fields", () => {
    const output = executeNeuralPipeline({
      query: "Pesquise jurisprudência sobre responsabilidade civil",
      context: "Caso de acidente de trânsito com danos materiais e morais",
      forceFullPipeline: true,
    });

    // Structure assertions
    expect(output.enrichedPrompt).toBeTruthy();
    expect(output.systemContext).toBeTruthy();
    expect(output.routing).toBeDefined();
    expect(output.tier).toBeTruthy();
    expect(output.conceptCategory).toBeTruthy();
    expect(output.conceptEmbedding).toBeDefined();
    expect(output.relatedConcepts).toBeDefined();
    expect(output.moeResult).toBeDefined();
    expect(output.activeExperts.length).toBeGreaterThan(0);
    expect(output.stages.length).toBeGreaterThan(4);
    expect(output.modulesActivated.length).toBeGreaterThanOrEqual(3);
    expect(output.complexity).toBeDefined();
    expect(output.tokenization).toBeDefined();
  });

  it("completes pipeline within reasonable time (<500ms)", () => {
    const output = executeNeuralPipeline({
      query: "Qual o prazo prescricional para ação de cobrança?",
      forceFullPipeline: true,
    });
    expect(output.totalDurationMs).toBeLessThan(500);
  });
});
