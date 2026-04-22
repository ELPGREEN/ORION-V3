import { useState, useCallback } from "react";
import { hfClient } from "@/lib/huggingface";

export interface LegalEntity {
  entity_group: string;
  word: string;
  score: number;
  start: number;
  end: number;
}

export interface LegalClassification {
  label: string;
  score: number;
}

export interface LegalAnalysisResult {
  entities: LegalEntity[];
  classification: LegalClassification[];
  summary: string;
  loading: boolean;
  error: string | null;
}

export function useLegalAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [classification, setClassification] = useState<LegalClassification[]>([]);
  const [summary, setSummary] = useState("");

  const extractEntities = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await hfClient.extractLegalEntities(text);
      setEntities(result.data);
      return result.data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao extrair entidades";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const classifyDocument = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await hfClient.classifyLegalDocument(text);
      const labels = result.data[0]?.map((r: { label: string; score: number }) => ({
        label: r.label,
        score: r.score,
      })) || [];
      setClassification(labels);
      return labels;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao classificar documento";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const summarizeDocument = useCallback(async (text: string, type: "contract" | "legal" = "legal") => {
    setLoading(true);
    setError(null);
    try {
      const result = type === "contract" 
        ? await hfClient.summarizeContract(text)
        : await hfClient.summarizeLegal(text);
      const summaryText = result.data[0]?.summary_text || "";
      setSummary(summaryText);
      return summaryText;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao resumir documento";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fullAnalysis = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const [entitiesResult, classResult, summaryResult] = await Promise.all([
        hfClient.extractLegalEntities(text),
        hfClient.classifyLegalDocument(text),
        hfClient.summarizeLegal(text),
      ]);

      setEntities(entitiesResult.data);
      const labels = classResult.data[0]?.map((r: { label: string; score: number }) => ({
        label: r.label,
        score: r.score,
      })) || [];
      setClassification(labels);
      const summaryText = summaryResult.data[0]?.summary_text || "";
      setSummary(summaryText);

      return {
        entities: entitiesResult.data,
        classification: labels,
        summary: summaryText,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro na análise completa";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setEntities([]);
    setClassification([]);
    setSummary("");
    setError(null);
  }, []);

  return {
    loading,
    error,
    entities,
    classification,
    summary,
    extractEntities,
    classifyDocument,
    summarizeDocument,
    fullAnalysis,
    clear,
  };
}
