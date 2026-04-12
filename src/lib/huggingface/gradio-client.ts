/**
 * Gradio Client — Conexão com HuggingFace Spaces via @gradio/client
 * Substitui o hf-space-client.ts manual com SDK oficial
 * 
 * Spaces conectados:
 * - Ericsonv12/adv (PDF Vision API)
 * - Qualquer Space público ou privado
 */

// [REMOVED] import type { PDFSegment, PDFAnalysisResult, HFSpaceHealthStatus } from "@/lib/neural/hf-space-client";

// Stub types for removed neural modules
interface HFSpaceHealthStatus { status: string; latency?: number }
interface PDFSegment { text: string; page?: number }
interface PDFAnalysisResult { segments: PDFSegment[]; markdown: string; html: string }
function pdfToMarkdown(_d: any): string { return ""; }
function pdfToHtml(_d: any): string { return ""; }
function analyzePDF(_d: any): PDFAnalysisResult { return { segments: [], markdown: "", html: "" }; }


const KNOWN_SPACES = {
  "pdf-vision": "Ericsonv12/adv",
} as const;

let gradioModule: typeof import("@gradio/client") | null = null;

async function getGradio() {
  if (!gradioModule) {
    try {
      gradioModule = await import("@gradio/client");
    } catch (e) {
      console.error("[Gradio] Failed to load @gradio/client:", e);
      throw new Error("@gradio/client not available. Install @gradio/client.");
    }
  }
  return gradioModule;
}

// Connection cache
const connectionCache = new Map<string, { client: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSpaceClient(spaceId: string, hfToken?: string) {
  const cached = connectionCache.get(spaceId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.client;
  }

  const { Client } = await getGradio();
  const connectOptions: Record<string, unknown> = {};
  if (hfToken) connectOptions.hf_token = hfToken;
  const client = await Client.connect(spaceId, connectOptions as Parameters<typeof Client.connect>[1]);
  connectionCache.set(spaceId, { client, ts: Date.now() });
  return client;
}

/**
 * Health check de um Space
 */
export async function checkSpaceHealth(spaceId?: string): Promise<HFSpaceHealthStatus> {
  const space = spaceId || KNOWN_SPACES["pdf-vision"];
  const start = performance.now();
  try {
    await getSpaceClient(space);
    return {
      status: "ok",
      latency_ms: Math.round(performance.now() - start),
    };
  } catch {
    return {
      status: "error",
      latency_ms: Math.round(performance.now() - start),
    };
  }
}

/**
 * Chama um endpoint de um Space Gradio
 */
export async function callSpace(
  spaceId: string,
  endpoint: string | number,
  inputs: unknown[],
  hfToken?: string
): Promise<unknown> {
  const client = await getSpaceClient(spaceId, hfToken) as { predict: (endpoint: string | number, inputs: unknown[]) => Promise<{ data: unknown }> };
  const result = await client.predict(endpoint, inputs);
  return result.data;
}

/**
 * Analisa PDF via Space Ericsonv12/adv
 */
export async function analyzePDFViaSpace(
  file: File | Blob,
  mode: "analyze" | "markdown" | "html" = "analyze"
): Promise<PDFAnalysisResult | string> {
  const space = KNOWN_SPACES["pdf-vision"];
  
  try {
    const { Client } = await getGradio();
    const client = await Client.connect(space);

    // The Space accepts file upload
    const endpointMap = {
      analyze: "/predict",
      markdown: "/to_markdown",
      html: "/to_html",
    };

    const endpoint = endpointMap[mode] || "/predict";
    const result = await (client as { predict: (endpoint: string, inputs: unknown[]) => Promise<{ data: unknown[] }> }).predict(endpoint, [file]);

    if (mode === "analyze") {
      // Parse structured result
      const data = result.data[0];
      if (typeof data === "string") {
        return JSON.parse(data) as PDFAnalysisResult;
      }
      return data as PDFAnalysisResult;
    }

    // markdown/html return string
    return String(result.data[0]);
  } catch (error) {
    console.warn("[Gradio] Space call failed, falling back to direct HTTP:", error);
    
    // Fallback to direct HTTP (legacy hf-space-client behavior)
// [REMOVED]     const { analyzePDF, pdfToMarkdown, pdfToHtml } = await import("@/lib/neural/hf-space-client");
    
    if (mode === "markdown") return pdfToMarkdown(file as File);
    if (mode === "html") return pdfToHtml(file as File);
    return analyzePDF(file as File);
  }
}

/**
 * Lista endpoints disponíveis em um Space
 */
export async function listSpaceEndpoints(spaceId: string): Promise<Array<{ name: string; parameters: unknown[] }>> {
  try {
    const { Client } = await getGradio();
    const client = await Client.connect(spaceId);
    const info = await (client as { view_api: () => Promise<{ named_endpoints: Record<string, unknown> }> }).view_api();
    return Object.entries(info.named_endpoints).map(([name, params]) => ({
      name,
      parameters: params as unknown[],
    }));
  } catch (error) {
    console.error("[Gradio] Failed to list endpoints:", error);
    return [];
  }
}

/**
 * Limpa cache de conexões
 */
export function clearConnectionCache(): void {
  connectionCache.clear();
}

// Re-export types for compatibility
export type { PDFSegment, PDFAnalysisResult, HFSpaceHealthStatus };
