/**
 * NEUROCORE AI — HuggingFace Space Client
 * Integração com o Space Ericsonv12/adv (PDF Vision API)
 * 
 * Endpoints:
 *   GET  /           — Health check
 *   POST /           — Analyze PDF layout → JSON segments
 *   POST /markdown   — Convert PDF → structured Markdown
 *   POST /html       — Convert PDF → HTML
 */

const HF_SPACE_BASE_URL = "https://ericsonv12-adv.hf.space";
const DEFAULT_TIMEOUT_MS = 30_000;
const COLD_START_TIMEOUT_MS = 120_000; // 120s for HF Space cold starts
const MAX_RETRIES = 2;
let _lastHealthCheck: { ok: boolean; ts: number } | null = null;

export interface PDFSegment {
  type: string;
  content: string;
  page: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  font_size?: number;
  font_name?: string;
  confidence?: number;
}

export interface PDFAnalysisResult {
  segments: PDFSegment[];
  page_count: number;
  metadata?: Record<string, unknown>;
}

export interface HFSpaceHealthStatus {
  status: "ok" | "error";
  latency_ms: number;
}

function getAdaptiveTimeout(): number {
  // Use longer timeout if last health check failed or is stale (cold start likely)
  if (!_lastHealthCheck || !_lastHealthCheck.ok || Date.now() - _lastHealthCheck.ts > 5 * 60 * 1000) {
    return COLD_START_TIMEOUT_MS;
  }
  return DEFAULT_TIMEOUT_MS;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs?: number
): Promise<Response> {
  const effectiveTimeout = timeoutMs ?? getAdaptiveTimeout();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok || attempt === retries) return response;
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError ?? new Error("Request failed");
}

function createFormData(file: File | Blob, filename?: string): FormData {
  const formData = new FormData();
  formData.append("file", file, filename ?? "document.pdf");
  return formData;
}

/**
 * Health check — verifica se o Space está online
 */
export async function checkHealth(): Promise<HFSpaceHealthStatus> {
  const start = performance.now();
  try {
    const response = await fetchWithTimeout(
      HF_SPACE_BASE_URL,
      { method: "GET" },
      5000
    );
    const isOk = response.ok;
    _lastHealthCheck = { ok: isOk, ts: Date.now() };
    return {
      status: isOk ? "ok" : "error",
      latency_ms: Math.round(performance.now() - start),
    };
  } catch {
    _lastHealthCheck = { ok: false, ts: Date.now() };
    return {
      status: "error",
      latency_ms: Math.round(performance.now() - start),
    };
  }
}

/**
 * Analisa layout do PDF → JSON com segmentos estruturados
 */
export async function analyzePDF(
  file: File | Blob,
  filename?: string
): Promise<PDFAnalysisResult> {
  const response = await fetchWithRetry(HF_SPACE_BASE_URL, {
    method: "POST",
    body: createFormData(file, filename),
  });
  
  if (!response.ok) {
    throw new Error(`PDF analysis failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Converte PDF → Markdown estruturado
 */
export async function pdfToMarkdown(
  file: File | Blob,
  filename?: string
): Promise<string> {
  const response = await fetchWithRetry(`${HF_SPACE_BASE_URL}/markdown`, {
    method: "POST",
    body: createFormData(file, filename),
  });
  
  if (!response.ok) {
    throw new Error(`PDF to markdown failed: ${response.status}`);
  }
  
  return response.text();
}

/**
 * Converte PDF → HTML
 */
export async function pdfToHtml(
  file: File | Blob,
  filename?: string
): Promise<string> {
  const response = await fetchWithRetry(`${HF_SPACE_BASE_URL}/html`, {
    method: "POST",
    body: createFormData(file, filename),
  });
  
  if (!response.ok) {
    throw new Error(`PDF to HTML failed: ${response.status}`);
  }
  
  return response.text();
}

/**
 * analyzeDocument — Roteia via Edge Function autenticada (pdf-layout-analysis)
 * com fallback direto ao HF Space se a Edge Function falhar.
 */
export async function analyzeDocument(
  file: File,
  mode: "markdown" | "html" | "analyze" = "markdown"
): Promise<{ content: string; source: string }> {
  // Converter File para base64
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const pdfBase64 = btoa(binary);

  // Tentar via Edge Function autenticada
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.functions.invoke("pdf-layout-analysis", {
      body: { pdfBase64, mode },
    });

    if (!error && data && !data.error) {
      return {
        content: data.content || JSON.stringify(data),
        source: data.source || "edge-function",
      };
    }
    console.warn("[analyzeDocument] Edge function failed:", error || data?.error);
  } catch (e) {
    console.warn("[analyzeDocument] Edge function unavailable:", e);
  }

  // Fallback direto ao HF Space
  const formData = new FormData();
  formData.append("file", file, file.name || "document.pdf");
  const endpoint = mode === "html" ? "/html" : mode === "analyze" ? "/" : "/markdown";
  
  const response = await fetchWithRetry(`${HF_SPACE_BASE_URL}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("HF Space indisponível");

  const text = await response.text();
  return { content: text, source: "hf-space-direct" };
}
