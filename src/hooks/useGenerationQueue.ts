import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type QueueJobStatus = "idle" | "queued" | "processing" | "completed" | "failed" | "pending";

// Persist active job so navigation away doesn't lose generation progress
const ACTIVE_JOB_KEY = "generation_queue_active_job";
const ACTIVE_JOB_START_KEY = "generation_queue_start_time";

function saveActiveJob(jobId: string) {
  try { localStorage.setItem(ACTIVE_JOB_KEY, jobId); } catch {}
}

function clearActiveJob() {
  try {
    localStorage.removeItem(ACTIVE_JOB_KEY);
    localStorage.removeItem(ACTIVE_JOB_START_KEY);
  } catch {}
}

function getActiveJob(): string | null {
  try { return localStorage.getItem(ACTIVE_JOB_KEY); } catch { return null; }
}

function saveJobStartTime(ts: number) {
  try { localStorage.setItem(ACTIVE_JOB_START_KEY, String(ts)); } catch {}
}

function getJobStartTime(): number | null {
  try {
    const v = localStorage.getItem(ACTIVE_JOB_START_KEY);
    return v ? Number(v) : null;
  } catch { return null; }
}

interface UseGenerationQueueReturn {
  enqueue: (jobType: string, params: Record<string, unknown>) => Promise<string | null>;
  jobStatus: QueueJobStatus;
  jobResult: string | null;
  jobMetadata: Record<string, unknown> | null;
  jobError: string | null;
  isPolling: boolean;
  activeJobId: string | null;
  jobStartTime: number | null;
  reset: () => void;
}

export function useGenerationQueue(): UseGenerationQueueReturn {
  const { toast } = useToast();
  const [jobStatus, setJobStatus] = useState<QueueJobStatus>("idle");
  const [jobResult, setJobResult] = useState<string | null>(null);
  const [jobMetadata, setJobMetadata] = useState<Record<string, unknown> | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStartTime, setJobStartTime] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const handleJobUpdate = useCallback((status: string, data: any) => {
    const queueStatus = status as QueueJobStatus;
    setJobStatus(queueStatus);

    if (queueStatus === "completed") {
      setJobResult(data.result || null);
      setJobMetadata(data.result_metadata as Record<string, unknown> | null);
      stopPolling();
      clearActiveJob();
    } else if (queueStatus === "failed") {
      setJobError(data.error_message || "Erro desconhecido");
      stopPolling();
      clearActiveJob();
      toast({
        title: "Erro na geração",
        description: data.error_message || "O job falhou após múltiplas tentativas.",
        variant: "destructive",
      });
    }
  }, [stopPolling, toast]);

  const startPolling = useCallback((jobId: string, existingStartTime?: number) => {
    stopPolling();
    setIsPolling(true);
    setActiveJobId(jobId);
    jobIdRef.current = jobId;
    saveActiveJob(jobId);

    // Persist or restore start time so phase progress survives navigation
    const startTs = existingStartTime ?? Date.now();
    setJobStartTime(startTs);
    saveJobStartTime(startTs);

    // Primary: Realtime subscription
    const channel = supabase
      .channel(`queue-job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generation_queue",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          handleJobUpdate(newData.status, newData);
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Fallback: Poll every 5s
    pollingRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from("generation_queue")
        .select("status, result, result_metadata, error_message, attempts, max_attempts")
        .eq("id", jobId)
        .single();

      if (error || !data) return;
      handleJobUpdate(data.status, data);
    }, 5000);
  }, [handleJobUpdate, stopPolling]);

  // On mount: reconnect to any active job from a previous navigation
  useEffect(() => {
    const savedJobId = getActiveJob();
    if (!savedJobId) return;

    // Check current status immediately
    supabase
      .from("generation_queue")
      .select("status, result, result_metadata, error_message, attempts, max_attempts")
      .eq("id", savedJobId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          clearActiveJob();
          return;
        }
        const status = data.status as QueueJobStatus;
        if (status === "pending" || status === "processing" || status === "queued") {
          // Still in progress — reconnect, restoring the original start time so phases don't restart
          const savedStart = getJobStartTime();
          setJobStatus(status);
          setActiveJobId(savedJobId);
          startPolling(savedJobId, savedStart ?? undefined);
          toast({
            title: "Geração em andamento",
            description: "Reconectando ao documento que está sendo gerado...",
          });
        } else if (status === "completed") {
          // Already done — restore result
          setJobStatus("completed");
          setJobResult(data.result || null);
          setJobMetadata(data.result_metadata as Record<string, unknown> | null);
          setActiveJobId(savedJobId);
          clearActiveJob();
        } else {
          // Failed or unknown
          clearActiveJob();
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = useCallback(async (
    jobType: string,
    params: Record<string, unknown>
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Não autenticado",
          description: "Faça login para gerar documentos.",
          variant: "destructive",
        });
        return null;
      }

      setJobStatus("queued");
      setJobResult(null);
      setJobMetadata(null);
      setJobError(null);

      const { data, error } = await supabase
        .from("generation_queue")
        .insert([{
          user_id: user.id,
          job_type: jobType,
          params: params as any,
          status: "pending",
          source_type: "manual",
        }])
        .select("id")
        .single();

      if (error) throw error;

      const jobId = data.id;
      startPolling(jobId);

      toast({
        title: "Documento na fila",
        description: "Seu documento está sendo gerado em segundo plano. Você pode navegar livremente!",
      });

      return jobId;
    } catch (err) {
      setJobStatus("failed");
      setJobError(err instanceof Error ? err.message : "Erro ao enfileirar");
      toast({
        title: "Erro",
        description: "Não foi possível enfileirar o job.",
        variant: "destructive",
      });
      return null;
    }
  }, [startPolling, toast]);

  const reset = useCallback(() => {
    stopPolling();
    clearActiveJob();
    setJobStatus("idle");
    setJobResult(null);
    setJobMetadata(null);
    setJobError(null);
    setActiveJobId(null);
    jobIdRef.current = null;
  }, [stopPolling]);

  // Cleanup on unmount (don't clear active job — let it persist for navigation)
  useEffect(() => {
    return () => {
      // Only stop local listeners, NOT the active job reference in localStorage
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return {
    enqueue,
    jobStatus,
    jobResult,
    jobMetadata,
    jobError,
    isPolling,
    activeJobId,
    jobStartTime,
    reset,
  };
}
