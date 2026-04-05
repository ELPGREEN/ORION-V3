import { useState, useEffect, useCallback, useRef } from "react";

interface IngestionJob {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  mode: string;
  tribunais: string[];
  startedAt: string;
  completedAt?: string;
  ackAt?: string; // heartbeat timestamp
  stats?: {
    totalProcessados: number;
    totalInseridos: number;
    totalDuplicados: number;
    totalErros: number;
  };
  error?: string;
  retryCount?: number;
}

const STORAGE_KEY = "datajud_ingestion_jobs";
const STALE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const ACK_INTERVAL_MS = 15 * 1000; // heartbeat every 15s
const MAX_RETRIES = 3;

function loadJobs(): IngestionJob[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: IngestionJob[]) {
  const recent = jobs.slice(-20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
}

/** Auto-expire stuck "running" jobs that haven't acked in STALE_TIMEOUT_MS */
function expireStaleJobs(jobs: IngestionJob[]): IngestionJob[] {
  const now = Date.now();
  return jobs.map(job => {
    if (job.status !== "running") return job;

    const lastAck = job.ackAt ? new Date(job.ackAt).getTime() : new Date(job.startedAt).getTime();
    if (now - lastAck > STALE_TIMEOUT_MS) {
      return {
        ...job,
        status: "failed" as const,
        error: `Timeout: job sem resposta há ${Math.round((now - lastAck) / 60000)} minutos`,
        completedAt: new Date().toISOString(),
      };
    }
    return job;
  });
}

export function useIngestionStatus() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [currentJob, setCurrentJob] = useState<IngestionJob | null>(null);
  const ackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load and expire on mount
  useEffect(() => {
    const loaded = loadJobs();
    const fixed = expireStaleJobs(loaded);
    setJobs(fixed);
    saveJobs(fixed);

    const running = fixed.find(j => j.status === "running");
    setCurrentJob(running || null);

    // Periodic check for stale jobs (every 30s)
    const checkInterval = setInterval(() => {
      setJobs(prev => {
        const updated = expireStaleJobs(prev);
        const hasChanges = updated.some((j, i) => j.status !== prev[i]?.status);
        if (hasChanges) {
          saveJobs(updated);
          const stillRunning = updated.find(j => j.status === "running");
          setCurrentJob(stillRunning || null);
        }
        return hasChanges ? updated : prev;
      });
    }, 30_000);

    return () => clearInterval(checkInterval);
  }, []);

  // Persist on change
  useEffect(() => {
    if (jobs.length > 0) saveJobs(jobs);
  }, [jobs]);

  // Heartbeat for running jobs
  const startHeartbeat = useCallback((jobId: string) => {
    if (ackIntervalRef.current) clearInterval(ackIntervalRef.current);

    ackIntervalRef.current = setInterval(() => {
      setJobs(prev => {
        const updated = prev.map(j =>
          j.id === jobId && j.status === "running"
            ? { ...j, ackAt: new Date().toISOString() }
            : j
        );
        saveJobs(updated);
        return updated;
      });
    }, ACK_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (ackIntervalRef.current) {
      clearInterval(ackIntervalRef.current);
      ackIntervalRef.current = null;
    }
  }, []);

  const startJob = useCallback((mode: string, tribunais: string[]): string => {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newJob: IngestionJob = {
      id: jobId,
      status: "running",
      mode,
      tribunais,
      startedAt: new Date().toISOString(),
      ackAt: new Date().toISOString(),
      retryCount: 0,
    };

    setJobs(prev => [...prev, newJob]);
    setCurrentJob(newJob);
    startHeartbeat(jobId);

    return jobId;
  }, [startHeartbeat]);

  const completeJob = useCallback((jobId: string, stats: IngestionJob["stats"]) => {
    stopHeartbeat();
    setJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, status: "completed" as const, completedAt: new Date().toISOString(), stats }
        : job
    ));
    setCurrentJob(null);
  }, [stopHeartbeat]);

  const failJob = useCallback((jobId: string, error: string) => {
    stopHeartbeat();
    setJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, status: "failed" as const, completedAt: new Date().toISOString(), error }
        : job
    ));
    setCurrentJob(null);
  }, [stopHeartbeat]);

  const retryJob = useCallback((jobId: string): boolean => {
    const job = jobs.find(j => j.id === jobId);
    if (!job || (job.retryCount || 0) >= MAX_RETRIES) return false;

    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? {
            ...j,
            status: "running" as const,
            startedAt: new Date().toISOString(),
            ackAt: new Date().toISOString(),
            completedAt: undefined,
            error: undefined,
            retryCount: (j.retryCount || 0) + 1,
          }
        : j
    ));

    const retried = { ...job, status: "running" as const, retryCount: (job.retryCount || 0) + 1 };
    setCurrentJob(retried);
    startHeartbeat(jobId);
    return true;
  }, [jobs, startHeartbeat]);

  const cancelJob = useCallback((jobId: string) => {
    stopHeartbeat();
    setJobs(prev => prev.map(job =>
      job.id === jobId && job.status === "running"
        ? { ...job, status: "failed" as const, completedAt: new Date().toISOString(), error: "Cancelado pelo usuário" }
        : job
    ));
    setCurrentJob(null);
  }, [stopHeartbeat]);

  const clearJobs = useCallback(() => {
    stopHeartbeat();
    setJobs([]);
    setCurrentJob(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [stopHeartbeat]);

  const getRecentJobs = useCallback((limit: number = 5) => {
    return jobs.slice(-limit).reverse();
  }, [jobs]);

  return {
    jobs,
    currentJob,
    isRunning: currentJob?.status === "running",
    startJob,
    completeJob,
    failJob,
    retryJob,
    cancelJob,
    clearJobs,
    getRecentJobs,
    maxRetries: MAX_RETRIES,
  };
}
