import { useState, useCallback, useRef } from "react";
import {
  Citation,
  extractAndVerifyCitations,
  ExtractResult,
} from "@/lib/citations/citationService";

interface UseCitationExtractorOptions {
  autoExtract?: boolean;
  contextDocumentId?: string;
  contextConversationId?: string;
}

export function useCitationExtractor(options: UseCitationExtractorOptions = {}) {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const processedTextsRef = useRef<Set<string>>(new Set());

  const extractFromText = useCallback(async (text: string) => {
    // Skip short texts or already processed
    if (!text || text.length < 50) return [];
    
    const textHash = text.substring(0, 200);
    if (processedTextsRef.current.has(textHash)) return citations;
    processedTextsRef.current.add(textHash);

    // Quick check: does text contain legal references?
    const hasLegalRef = /(?:Lei|Decreto|Art(?:igo)?\.?\s*\d|STF|STJ|TST|TJ[A-Z]{2}|Constituição|CF)/i.test(text);
    if (!hasLegalRef) return [];

    setIsExtracting(true);
    try {
      const result: ExtractResult = await extractAndVerifyCitations(
        text,
        options.contextDocumentId,
        options.contextConversationId
      );

      if (result.results?.length) {
        const newCitations = result.results
          .map((r) => r.citation)
          .filter(Boolean);
        
        setCitations((prev) => {
          const ids = new Set(prev.map((c) => c.id));
          const unique = newCitations.filter((c) => !ids.has(c.id));
          return [...prev, ...unique];
        });

        return newCitations;
      }
      return [];
    } catch (error) {
      console.warn("[CitationExtractor] Error:", error);
      return [];
    } finally {
      setIsExtracting(false);
    }
  }, [options.contextDocumentId, options.contextConversationId, citations]);

  const clearCitations = useCallback(() => {
    setCitations([]);
    processedTextsRef.current.clear();
  }, []);

  return {
    citations,
    isExtracting,
    extractFromText,
    clearCitations,
  };
}
