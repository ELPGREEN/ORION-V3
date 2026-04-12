import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface InferenceMetadata {
  provider: string;
  model: string;
  ragSourcesUsed: number;
  privateContextUsed: number;
  confidenceScore: number;
  distilledModelActive: boolean;
  weightsLoaded: boolean;
}

interface InferenceResult {
  response: string;
  metadata: InferenceMetadata;
}

export function useNeuralInference() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<InferenceResult | null>(null);

  const infer = useCallback(
    async (
      query: string,
      options?: {
        privateContext?: Array<{ title: string; content: string }>;
        domain?: string;
      }
    ): Promise<InferenceResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "neural-inference",
          {
            body: {
              query,
              userId: user?.id,
              privateContext: options?.privateContext,
              domain: options?.domain || "general",
              stream: false,
            },
          }
        );

        if (fnError) {
          setError(fnError.message);
          return null;
        }

        if (!data?.success) {
          setError(data?.error || "Inference failed");
          return null;
        }

        const result: InferenceResult = {
          response: data.response,
          metadata: data.metadata,
        };

        setLastResult(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  return { infer, loading, error, lastResult };
}
