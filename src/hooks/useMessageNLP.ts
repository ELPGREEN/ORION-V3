/**
 * Hook para enriquecer mensagens do chat com NLP browser-side
 * Usa Transformers.js (WASM) — zero custo de API
 */
import { useState, useCallback, useRef } from "react";

interface SentimentResult {
  label: string;
  score: number;
}

interface EntityResult {
  entity: string;
  word: string;
  score: number;
  start: number;
  end: number;
}

export interface MessageNLPData {
  messageId: string;
  sentiment?: SentimentResult;
  entities?: EntityResult[];
  loading?: boolean;
}

export function useMessageNLP() {
  const [nlpData, setNlpData] = useState<Record<string, MessageNLPData>>({});
  const processedRef = useRef<Set<string>>(new Set());

  const analyzeMessage = useCallback(async (messageId: string, text: string) => {
    if (processedRef.current.has(messageId) || !text || text.length < 10) return;
    processedRef.current.add(messageId);

    setNlpData(prev => ({ ...prev, [messageId]: { messageId, loading: true } }));

    try {
      const { analyzeSentiment, extractEntities } = await import("@/lib/huggingface/transformers-browser");

      // Run sentiment and NER in parallel
      const [sentimentResults, entityResults] = await Promise.all([
        analyzeSentiment(text.slice(0, 512)).catch(() => null),
        extractEntities(text.slice(0, 512)).catch(() => null),
      ]);

      const sentiment = sentimentResults?.[0] || undefined;

      // Filter entities: keep only high-confidence, deduplicate
      const entities = entityResults
        ?.filter(e => e.score > 0.7)
        ?.reduce((acc: EntityResult[], e) => {
          if (!acc.find(a => a.word === e.word && a.entity === e.entity)) acc.push(e);
          return acc;
        }, []) || [];

      setNlpData(prev => ({
        ...prev,
        [messageId]: { messageId, sentiment, entities, loading: false },
      }));
    } catch (err) {
      console.warn("[useMessageNLP] Failed:", err);
      setNlpData(prev => ({
        ...prev,
        [messageId]: { messageId, loading: false },
      }));
    }
  }, []);

  return { nlpData, analyzeMessage };
}
