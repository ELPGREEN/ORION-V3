import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  updateNeuromodulation,
  modulateLearningRate,
  DEFAULT_NEUROMODULATION,
  type NeuromodulationState,
} from "@/lib/neural/stdp";
import {
  analyzeLegalSequence,
  type LegalSequenceAnalysis,
} from "@/lib/neural/mamba";
import {
  localJudgeScore,
  type JudgeVerdict,
} from "@/lib/neural/llm-judge";

export interface ReviewIssue {
  id: string;
  type: "error" | "warning" | "suggestion";
  category: "grammar" | "legal" | "structure" | "consistency" | "style";
  message: string;
  excerpt: string;
  fix: string;
  replacementText: string;
  autoApplicable: boolean;
  confidence?: number;
  headSource?: string;
  sourceHash?: string;
}

export interface NeuralMetrics {
  grammarScore?: number;
  legalScore?: number;
  structureScore?: number;
  consistencyScore?: number;
  styleScore?: number;
  overallScore?: number;
  mambaCoherence?: number;
  longRangeDeps?: number;
  documentComplexity?: string;
  // v21: LLM-as-Judge
  judgeGrade?: string;
  judgeScore?: number;
  citationCount?: number;
  biasWarningCount?: number;
  lgpdCompliant?: boolean;
}

export interface DocumentElement {
  type: "title" | "subtitle" | "paragraph" | "citation" | "jurisprudence" | "article" | "signature" | "date" | "list" | "header" | "clause";
  text: string;
  count: number;
}

export interface StructuralAnalysis {
  score: number;
  missingSections: Array<{ name: string; importance: "critical" | "recommended" | "optional"; suggestion: string }>;
  presentSections: string[];
  summary: string;
  elements?: DocumentElement[];
}

interface UseAIRealtimeReviewOptions {
  enabled: boolean;
  documentType?: string;
  debounceMs?: number;
}

const extractPlainText = (html: string): string => {
  if (!html) return "";
  if (typeof DOMParser === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
};

export function useAIRealtimeReview({ enabled, documentType, debounceMs = 8000 }: UseAIRealtimeReviewOptions) {
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [neuralMetrics, setNeuralMetrics] = useState<NeuralMetrics>({});
  const [structural, setStructural] = useState<StructuralAnalysis | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [structuralLoading, setStructuralLoading] = useState(false);
  const [neuroState, setNeuroState] = useState<NeuromodulationState>(DEFAULT_NEUROMODULATION);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHashRef = useRef("");
  const reviewCountRef = useRef(0);
  const requestIdRef = useRef(0);

  const runReview = useCallback(async (html: string) => {
    if (!enabled) return;
    const plain = extractPlainText(html);
    if (plain.length < 150) return;

    // Robust hash: length + multiple samples across the document (start, 25%, 50%, 75%, end)
    const sampleSize = 200;
    const len = plain.length;
    const positions = [0, Math.floor(len * 0.25), Math.floor(len * 0.5), Math.floor(len * 0.75), Math.max(0, len - sampleSize)];
    const hash = len + "_" + positions.map(p => plain.substring(p, p + sampleSize)).join("_");
    if (hash === lastHashRef.current) return;
    lastHashRef.current = hash;

    // Versioning: ignore stale responses
    const thisRequestId = ++requestIdRef.current;

    setReviewLoading(true);
    try {
      // Run Mamba SSM analysis locally (O(n) — fast even for large docs)
      const words = plain.split(/\s+/);
      const tokenScores = words.map((w, i) => {
        const len = w.length / 15;
        const pos = i / words.length;
        return Math.tanh(len + pos * 0.5);
      });
      
      const mambaAnalysis = analyzeLegalSequence(tokenScores, {
        dState: 16,
        nLayers: 6,
        useBidirectional: true,
        seqLen: tokenScores.length,
        dModel: 768,
        dConv: 4,
        expandFactor: 2,
        dtRank: 48,
      });

      const judgeVerdict = localJudgeScore(html, documentType);

      const { data, error } = await supabase.functions.invoke("ai-autocomplete", {
        body: { mode: "review", fullText: html, documentType },
      });
      if (error) throw error;

      // Stale response guard: if a newer request was fired, discard this one
      if (thisRequestId !== requestIdRef.current) return;
      
      const rawIssues: any[] = data?.issues || [];
      
      // Normalize issues with id, autoApplicable, replacementText
      const reviewIssues: ReviewIssue[] = rawIssues.map((issue: any, idx: number) => {
        const excerpt = (issue.excerpt || "").trim();
        const replacementText = (issue.replacementText || issue.fix || "").trim();
        const firstIdx = excerpt ? plain.indexOf(excerpt) : -1;
        const isUniqueExcerpt = firstIdx !== -1 && firstIdx === plain.lastIndexOf(excerpt);

        // Auto-applicable only if excerpt is unique + literal and replacement is direct substitution
        const isDirectFix = excerpt.length >= 3
          && replacementText.length >= 1
          && !/^(incluir|adicionar|verificar|inserir|remover|ajustar|considerar|revisar)/i.test(replacementText)
          && isUniqueExcerpt;
        return {
          id: `review-${thisRequestId}-${idx}`,
          type: issue.type || "suggestion",
          category: issue.category || "style",
          message: issue.message || "",
          excerpt,
          fix: issue.fix || "",
          replacementText,
          autoApplicable: issue.autoApplicable ?? isDirectFix,
          confidence: issue.confidence,
          headSource: issue.headSource,
          sourceHash: hash,
        };
      });
      
      // Inject bias warnings
      for (const warn of judgeVerdict.biasWarnings) {
        reviewIssues.push({
          id: `judge-${thisRequestId}-${reviewIssues.length}`,
          type: warn.severity === "high" ? "error" : "warning",
          category: warn.type === "lgpd_risk" ? "legal" : "consistency",
          message: warn.description,
          excerpt: "",
          fix: warn.suggestion,
          replacementText: "",
          autoApplicable: false,
          confidence: 0.75,
          headSource: "llm-judge",
          sourceHash: hash,
        });
      }
      
      setIssues(reviewIssues);
      
      const serverMetrics = data?.neuralMetrics || {};
      setNeuralMetrics({
        ...serverMetrics,
        mambaCoherence: mambaAnalysis.documentCoherence,
        longRangeDeps: mambaAnalysis.longRangeDependencies,
        documentComplexity: mambaAnalysis.estimatedComplexity,
        judgeGrade: judgeVerdict.grade,
        judgeScore: judgeVerdict.overallScore,
        citationCount: judgeVerdict.citations.length,
        biasWarningCount: judgeVerdict.biasWarnings.length,
        lgpdCompliant: !judgeVerdict.biasWarnings.some(w => w.type === "lgpd_risk"),
      });
      
      reviewCountRef.current++;
      const errorCount = reviewIssues.filter((i: ReviewIssue) => i.type === "error").length;
      
      // Bidirectional neural feedback: Mamba coherence feeds back into neuromodulation
      // Low coherence → high uncertainty → more frequent reviews
      // High coherence → low uncertainty → less frequent reviews
      const mambaUncertainty = 1 - mambaAnalysis.documentCoherence;
      const issueUncertainty = errorCount / Math.max(reviewIssues.length, 1);
      const blendedUncertainty = issueUncertainty * 0.6 + mambaUncertainty * 0.4;
      
      // Complexity-driven novelty: complex documents stay novel longer
      const complexityNovelty = mambaAnalysis.estimatedComplexity === "very_complex" || mambaAnalysis.estimatedComplexity === "complex" ? 0.4
        : mambaAnalysis.estimatedComplexity === "moderate" ? 0.2 : 0.1;
      
      setNeuroState(prev => updateNeuromodulation(prev, {
        reward: errorCount === 0 ? 0.3 : -0.1 * errorCount,
        uncertainty: blendedUncertainty,
        novelty: reviewCountRef.current <= 3 ? 0.5 : complexityNovelty,
        successStreak: errorCount === 0 ? reviewCountRef.current : 0,
      }));
    } catch (err) {
      console.warn("[AIRealtimeReview] Review failed:", err);
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setReviewLoading(false);
      }
    }
  }, [enabled, documentType]);

  const runStructuralAnalysis = useCallback(async (html: string) => {
    if (!enabled) return;
    setStructuralLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-autocomplete", {
        body: { mode: "structural", fullText: html, documentType },
      });
      if (error) throw error;
      if (!data) throw new Error("Resposta vazia da análise estrutural");
      setStructural(data);
    } catch (err) {
      setStructural(null);
      throw err; // Re-throw so callers can handle
    } finally {
      setStructuralLoading(false);
    }
  }, [enabled, documentType]);

  // Adaptive debounce: neuromodulation adjusts review frequency
  // Use ref to avoid re-creating scheduleReview on every neuroState change
  const neuroStateRef = useRef(neuroState);
  neuroStateRef.current = neuroState;

  const scheduleReview = useCallback((html: string) => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // High norepinephrine (alertness) → review sooner
    // High serotonin (calm) → review less frequently
    const adaptiveDelay = debounceMs * modulateLearningRate(1, neuroStateRef.current);
    const clampedDelay = Math.max(4000, Math.min(15000, adaptiveDelay));
    
    timerRef.current = setTimeout(() => {
      runReview(html);
      // Periodic structural refresh: every 3rd review keeps structure analysis current
      if (reviewCountRef.current > 0 && reviewCountRef.current % 3 === 0) {
        runStructuralAnalysis(html).catch(() => {});
      }
    }, clampedDelay);
  }, [enabled, debounceMs, runReview, runStructuralAnalysis]);

  const initialRanRef = useRef(false);

  // Auto-run review + structural analysis once on first meaningful content
  const triggerInitialReview = useCallback((html: string) => {
    if (initialRanRef.current || !enabled) return;
    const plain = extractPlainText(html);
    if (plain.length >= 150) {
      initialRanRef.current = true;
      // Small delay to let UI settle, then run both review and structural in parallel
      setTimeout(() => {
        runReview(html);
        runStructuralAnalysis(html).catch(() => {});
      }, 1500);
    }
  }, [enabled, runReview, runStructuralAnalysis]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const clearIssues = useCallback(() => {
    setIssues([]);
    lastHashRef.current = "";
  }, []);

  const removeIssue = useCallback((issueId: string) => {
    setIssues(prev => prev.filter(issue => issue.id !== issueId));
  }, []);

  const removeMissingSection = useCallback((sectionName: string) => {
    setStructural(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        missingSections: prev.missingSections.filter(s => s.name !== sectionName),
        presentSections: [...prev.presentSections, sectionName],
      };
    });
  }, []);

  return {
    issues,
    neuralMetrics,
    structural,
    reviewLoading,
    structuralLoading,
    scheduleReview,
    runReview,
    runStructuralAnalysis,
    triggerInitialReview,
    neuroState,
    clearIssues,
    removeIssue,
    removeMissingSection,
  };
}
