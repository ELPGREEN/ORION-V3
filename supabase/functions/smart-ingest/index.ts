import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════
// SMART INGEST v13 — Large Book Support (OpenAI Vision)
// Uses OpenAI GPT-4o-mini for PDF text extraction + queue-based embedding
// Flow: upload → extract_text (OpenAI vision for PDF) → smart_chunk → embed batch → queue remainder
// ═══════════════════════════════════════
// Uses direct text extraction + OCR fallback + queue-based embedding
// Flow: upload → extract_text (direct/OCR) → smart_chunk → embed batch → queue remainder
// ═══════════════════════════════════════

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 768;
const GLOBAL_DEADLINE_MS = 50_000;
const MAX_INLINE_CHUNKS = 30; // Max chunks to embed in this call; rest goes to queue

// ─── Category Detection ───
function detectQueryCategory(text: string): string {
  const q = text.toLowerCase();
  const categoryKeywords: Record<string, string[]> = {
    constitucional: ["constitucional", "adi", "adpf", "mandado de segurança", "habeas corpus", "stf", "constituição"],
    trabalhista: ["trabalhista", "clt", "reclamação trabalhista", "tst", "fgts", "demissão", "rescisão"],
    penal: ["penal", "crime", "réu", "acusado", "prisão", "furto", "roubo", "homicídio", "código penal"],
    civil: ["civil", "contrato", "responsabilidade civil", "dano", "obrigação"],
    tributario: ["tributário", "imposto", "tributo", "icms", "irpf", "contribuição", "fiscal"],
    administrativo: ["administrativo", "licitação", "contrato administrativo", "servidor público", "concurso"],
    ambiental: ["ambiental", "meio ambiente", "licenciamento", "ibama", "poluição"],
    consumidor: ["consumidor", "cdc", "defeito", "produto", "serviço"],
    previdenciario: ["previdenciário", "aposentadoria", "inss", "benefício", "pensão por morte"],
    eleitoral: ["eleitoral", "eleição", "tse", "candidato"],
    empresarial: ["empresarial", "sociedade", "sócio", "falência", "recuperação judicial"],
    familia: ["família", "divórcio", "guarda", "alimentos", "pensão alimentícia", "adoção"],
  };
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => q.includes(kw))) return cat;
  }
  return "geral";
}

// ─── Smart Legal Chunking ───
function smartLegalChunk(text: string, maxChunkSize = 1500): string[] {
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  const legalBoundaries = /(?=\n\s*(?:Art\.\s*\d|§\s*\d|Parágrafo|CAPÍTULO|SEÇÃO|TÍTULO|CLÁUSULA|Inciso|Alínea|\d+[.)]\s))/gi;
  const sections = text.split(legalBoundaries).filter(s => s.trim().length > 0);

  let currentChunk = "";
  for (const section of sections) {
    if ((currentChunk + section).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk += section;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  if (chunks.length <= 1 && text.length > maxChunkSize) {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const fallback: string[] = [];
    let current = "";
    for (const para of paragraphs) {
      if ((current + "\n\n" + para).length > maxChunkSize && current.length > 0) {
        fallback.push(current.trim());
        current = para;
      } else {
        current += (current ? "\n\n" : "") + para;
      }
    }
    if (current.trim()) fallback.push(current.trim());
    return fallback.length > 0 ? fallback : [text.substring(0, maxChunkSize)];
  }

  return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
}

// ─── Generate Embedding (Gemini FREE) ───
function getGeminiKeys(): string[] {
  return ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"]
    .map(n => Deno.env.get(n)).filter((k): k is string => !!k);
}

async function generateEmbedding(text: string, signal?: AbortSignal): Promise<number[]> {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new Error("No Gemini keys configured for embeddings");
  for (const key of keys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: signal || AbortSignal.timeout(10000),
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: text.substring(0, 8000) }] },
            outputDimensionality: 768,
          }),
        }
      );
      if (!response.ok) { await response.text(); continue; }
      const data = await response.json();
      const emb = data?.embedding?.values;
      if (emb && emb.length > 0) {
        return emb.length >= 768 ? emb.slice(0, 768) : [...emb, ...new Array(768 - emb.length).fill(0)];
      }
    } catch { continue; }
  }
  throw new Error("All Gemini keys exhausted for embedding");
}

// ─── Extract text from PDF using Gemini Vision (FREE) ───
async function extractTextWithOpenAI(fileBase64: string, fileName: string, deadline: number): Promise<string> {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new Error("No Gemini API keys configured");

  const firstPrompt = `Extraia TODO o texto deste documento PDF de forma completa e fiel ao original.
Mantenha a estrutura de parágrafos, títulos, artigos e numeração.
Não resuma, não omita nenhuma parte. Retorne apenas o texto extraído, sem comentários.
Se o documento for muito longo, extraia o máximo possível desde o início.`;

  let fullText = "";
  let keyIndex = 0;

  // Pass 1: initial extraction
  for (const key of keys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(120_000),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [
              { text: firstPrompt },
              { inlineData: { mimeType: "application/pdf", data: fileBase64 } }
            ] }],
            generationConfig: { maxOutputTokens: 16384, temperature: 0.1 },
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Gemini pass 1 failed (${response.status})`);
        await response.text();
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text.length > 100) {
        fullText = text;
        keyIndex = keys.indexOf(key);
        console.log(`✅ Gemini pass 1: ${text.length} chars from ${fileName}`);
        break;
      }
    } catch (err: any) {
      console.warn(`Gemini pass 1 error: ${err.message}`);
    }
  }

  if (!fullText) throw new Error("Gemini text extraction failed with all keys");

  // Multi-pass continuation: keep asking for more text if the output was likely truncated
  // GPT-4o-mini max output is ~16K tokens ≈ ~50K chars for Portuguese
  const MAX_PASSES = 5;
  for (let pass = 2; pass <= MAX_PASSES; pass++) {
    // Stop if we're running low on time or text wasn't truncated
    if (Date.now() > deadline - 20000) {
      console.log(`⏰ Stopping at pass ${pass - 1} due to deadline`);
      break;
    }
    // If last response was short, probably got all the text
    const lastPassLen = pass === 2 ? fullText.length : (fullText.length - fullText.lastIndexOf("\n\n--- CONTINUAÇÃO ---\n\n"));
    if (lastPassLen < 10000) {
      console.log(`📄 Pass ${pass - 1} returned short text, likely complete`);
      break;
    }

    const lastContext = fullText.substring(fullText.length - 800);
    const continuePrompt = `Continue extraindo o texto deste documento PDF a partir do ponto onde parou.
O último trecho extraído terminou assim:
"${lastContext}"

Continue EXATAMENTE de onde parou. Retorne apenas o texto continuado, sem repetir o que já foi extraído, sem comentários.`;

    const key = keys[keyIndex % keys.length];
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(Math.min(90_000, deadline - Date.now() - 10000)),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [
              { text: continuePrompt },
              { inlineData: { mimeType: "application/pdf", data: fileBase64 } }
            ] }],
            generationConfig: { maxOutputTokens: 16384, temperature: 0.1 },
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Gemini pass ${pass} failed (${response.status})`);
        await response.text();
        break;
      }

      const data = await response.json();
      const moreText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (moreText.length < 500) {
        console.log(`📄 Pass ${pass}: only ${moreText.length} chars, document likely complete`);
        break;
      }

      fullText += "\n\n" + moreText;
      console.log(`📖 Pass ${pass}: +${moreText.length} chars (total: ${fullText.length})`);
      keyIndex++;
    } catch (err: any) {
      console.warn(`Gemini pass ${pass} error: ${err.message}`);
      break;
    }
  }

  // If we still have time and the book seems large, enqueue more passes
  console.log(`📚 Final extraction: ${fullText.length} chars from ${fileName}`);
  return fullText;
}


// ─── Corpus Normalization ───
function normalizeCorpus(text: string): string {
  let t = text;
  // Remove control characters (except \n, \t, \r)
  t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Collapse multiple spaces/tabs into single space
  t = t.replace(/[^\S\n\r]+/g, " ");
  // Normalize hyphens and dashes
  t = t.replace(/[–—−]/g, "—");
  // Normalize typographic quotes
  t = t.replace(/[""]/g, '"');
  t = t.replace(/['']/g, "'");
  // Remove repeated headers/footers (common patterns)
  t = t.replace(/\bP[áa]gina\s+\d+\s+de\s+\d+\b/gi, "");
  t = t.replace(/\bDi[áa]rio\s+Oficial\b[^\n]*/gi, "");
  // Remove consecutive blank lines (max 2)
  t = t.replace(/\n{4,}/g, "\n\n\n");
  // Deduplicate consecutive identical paragraphs
  const paragraphs = t.split(/\n\s*\n/);
  const deduped: string[] = [];
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (trimmed && (deduped.length === 0 || deduped[deduped.length - 1] !== trimmed)) {
      deduped.push(trimmed);
    }
  }
  return deduped.join("\n\n");
}

// ─── Log ingestion failure ───
async function logIngestionFailure(supabaseAdmin: any, fileName: string, fileType: string, errorMsg: string, userId?: string) {
  try {
    await supabaseAdmin.from("neural_learning_data").insert({
      interaction_type: "document_upload",
      input_text: `FALHA: ${fileName} (${fileType})`,
      output_text: errorMsg.substring(0, 5000),
      quality_score: 0,
      learned: false,
      user_id: userId || null,
      metadata: { file_name: fileName, file_type: fileType, error: errorMsg, source: "smart_ingest_v11", status: "failed" },
    });
  } catch (e) { console.warn("Failed to log ingestion failure:", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const deadline = Date.now() + GLOBAL_DEADLINE_MS;
  const globalAbort = new AbortController();
  const deadlineTimer = setTimeout(() => globalAbort.abort(), GLOBAL_DEADLINE_MS);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      clearTimeout(deadlineTimer);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !userData?.user) {
      clearTimeout(deadlineTimer);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const body = await req.json();
    const { storagePath, fileName, fileType, continuationChunks, continuationMeta } = body;

    // ═══ CONTINUATION MODE: process queued chunks ═══
    if (continuationChunks && Array.isArray(continuationChunks)) {
      console.log(`📦 Continuation: embedding ${continuationChunks.length} remaining chunks for ${continuationMeta?.fileName || "unknown"}`);
      
      let indexed = 0;
      const BATCH = 5;
      const category = continuationMeta?.category || "geral";
      const tags = continuationMeta?.tags || [category];
      const origFileName = continuationMeta?.fileName || "documento";
      const origStoragePath = continuationMeta?.storagePath || "";
      const chunkOffset = continuationMeta?.chunkOffset || 0;
      const totalChunks = continuationMeta?.totalChunks || continuationChunks.length;

      for (let i = 0; i < continuationChunks.length; i += BATCH) {
        if (Date.now() > deadline - 5000) {
          console.warn(`⏰ Continuation deadline, indexed ${indexed}/${continuationChunks.length}`);
          break;
        }

        const batch = continuationChunks.slice(i, i + BATCH);
        const embeddings = await Promise.all(batch.map((c: string) => generateEmbedding(c, globalAbort.signal)));

        const kbInserts = batch.map((chunk: string, idx: number) => ({
          title: `${origFileName} (parte ${chunkOffset + i + idx + 1}/${totalChunks})`,
          content: chunk,
          source_type: "documento_upload",
          source_reference: origStoragePath,
          tags,
          user_id: userId,
          is_processed: true,
          embedding: `[${embeddings[idx].join(",")}]`,
        }));

        const leInserts = batch.map((chunk: string, idx: number) => ({
          title: `${origFileName} (parte ${chunkOffset + i + idx + 1}/${totalChunks})`,
          content: chunk,
          source: "user_upload",
          source_label: "Upload do Advogado",
          content_type: category,
          url: null,
          published_date: new Date().toISOString().split("T")[0],
          metadata: { uploaded_by: userId, file_name: origFileName, category, chunk_index: chunkOffset + i + idx },
          embedding: `[${embeddings[idx].join(",")}]`,
          query_origin: `smart_ingest:${origFileName}`,
        }));

        const { data: kbRows } = await supabaseAdmin.from("neural_knowledge_base").insert(kbInserts).select("id");
        await supabaseAdmin.from("legal_embeddings").insert(leInserts);
        indexed += batch.length;

        // Phase 1 dual-write: mirror to Zilliz (fire-and-forget)
        if (kbRows?.length) {
          const { mirrorToZilliz } = await import("../_shared/zilliz-mirror.ts");
          mirrorToZilliz(kbRows.map((r: any, idx: number) => ({
            id: r.id,
            text: `${kbInserts[idx].title}\n\n${kbInserts[idx].content}`,
            metadata: { source_type: kbInserts[idx].source_type, origin: "smart-ingest" },
          })));
        }

        if (i + BATCH < continuationChunks.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // If still more chunks left, enqueue another continuation
      const remainingChunks = continuationChunks.slice(indexed);
      if (remainingChunks.length > 0) {
        console.log(`📋 Re-enqueueing ${remainingChunks.length} remaining chunks`);
        await supabaseAdmin.from("generation_queue").insert({
          user_id: userId,
          job_type: "large_pdf_embed",
          status: "pending",
          max_attempts: 5,
          params: {
            continuationChunks: remainingChunks,
            continuationMeta: {
              ...continuationMeta,
              chunkOffset: chunkOffset + indexed,
            },
          },
          prompt: `Continuation embedding: ${origFileName} (${remainingChunks.length} chunks remaining)`,
        });
      }

      clearTimeout(deadlineTimer);
      return new Response(JSON.stringify({
        success: true,
        continuation: true,
        indexed,
        remaining: remainingChunks.length,
        fileName: origFileName,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══ NORMAL MODE: new file ingestion ═══
    if (!storagePath) {
      clearTimeout(deadlineTimer);
      return new Response(JSON.stringify({ error: "storagePath is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📥 Smart Ingest v11: Processing ${fileName} (${fileType})`);

    // Step 1: Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    const fileSize = fileData.size;
    console.log(`📁 File size: ${(fileSize / 1024 / 1024).toFixed(1)}MB`);

    // Step 2: Extract text
    let extractedText = "";
    let extractionMethod = "direct";

    if (fileType === "text/plain" || fileName?.endsWith(".txt")) {
      extractedText = await fileData.text();
      extractionMethod = "text";
    } else if (fileType === "application/pdf" || fileName?.endsWith(".pdf")) {
      // ═══ PDF: Convert to base64 and use OpenAI Vision for text extraction ═══
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      // Try OpenAI Vision first (best quality)
      try {
        console.log(`📚 Extracting text from PDF via OpenAI Vision (multi-pass)...`);
        extractedText = await extractTextWithOpenAI(base64, fileName, deadline);
        extractionMethod = "openai_vision";
      } catch (oaiErr: any) {
        console.warn(`⚠️ OpenAI Vision failed: ${oaiErr.message}`);
      }

      // If OpenAI Vision didn't work or returned too little, try OCR endpoint
      if (extractedText.trim().length < 200 && fileSize < 15 * 1024 * 1024) {
        console.log(`🔍 Trying OCR fallback...`);
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
          const ocrTimeout = Math.min(30000, deadline - Date.now() - 10000);
          if (ocrTimeout > 5000) {
            const ocrResponse = await fetch(`${supabaseUrl}/functions/v1/ocr-document`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
                apikey: anonKey,
              },
              signal: AbortSignal.timeout(ocrTimeout),
              body: JSON.stringify({ imageBase64: base64 }),
            });
            if (ocrResponse.ok) {
              const ocrData = await ocrResponse.json();
              if ((ocrData.fullText || "").length > extractedText.length) {
                extractedText = ocrData.fullText;
                extractionMethod = "ocr";
              }
            }
          }
        } catch (ocrErr: any) {
          console.warn(`⚠️ OCR fallback failed: ${ocrErr.message}`);
        }
      }

      // Last resort: try direct text extraction (works for some PDFs with embedded text)
      if (extractedText.trim().length < 200) {
        try {
          const directText = await fileData.text();
          const cleaned = directText.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\uFFFF\n\r\t]/g, " ").replace(/\s{3,}/g, " ");
          // Only use if it looks like real text (has words, not just binary garbage)
          const wordCount = cleaned.split(/\s+/).filter((w: string) => w.length > 3).length;
          if (wordCount > 50 && cleaned.length > extractedText.length) {
            extractedText = cleaned;
            extractionMethod = "text_direct";
          }
        } catch { /* ignore */ }
      }
    } else {
      extractedText = await fileData.text();
      extractionMethod = "text";
    }

    // Strip null bytes
    extractedText = extractedText.replace(/\u0000/g, "");

    // ─── Normalização de Corpus (Open Australian Legal LLM-inspired) ───
    extractedText = normalizeCorpus(extractedText);

    if (!extractedText || extractedText.trim().length < 50) {
      await logIngestionFailure(supabaseAdmin, fileName, fileType, 
        `Texto extraído muito curto (${extractedText?.length || 0} chars) via ${extractionMethod}`, userId);
      clearTimeout(deadlineTimer);
      return new Response(JSON.stringify({
        error: "Texto extraído muito curto ou vazio. O PDF pode ser escaneado sem texto selecionável.",
        extracted_length: extractedText?.length || 0,
        extraction_method: extractionMethod,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`📄 Extracted ${extractedText.length} chars via ${extractionMethod} from ${fileName}`);

    // Step 3: Smart chunking (NO truncation — chunk everything)
    const chunks = smartLegalChunk(extractedText, 1500);
    console.log(`🔪 Split into ${chunks.length} chunks`);

    // Step 4: Classify content
    const category = detectQueryCategory(extractedText.substring(0, 2000));
    const tags = [category, fileType?.split("/")[1] || "documento"].filter(Boolean);
    console.log(`🏷️ Classified as: ${category}`);

    // Step 5: Embed first batch inline (within deadline)
    let indexed = 0;
    const BATCH = 5;
    const inlineLimit = Math.min(chunks.length, MAX_INLINE_CHUNKS);

    for (let i = 0; i < inlineLimit; i += BATCH) {
      if (Date.now() > deadline - 5000) {
        console.warn(`⏰ Deadline approaching, indexed ${indexed}/${chunks.length} chunks`);
        break;
      }

      const batch = chunks.slice(i, i + BATCH);
      const embeddings = await Promise.all(batch.map(c => generateEmbedding(c, globalAbort.signal)));

      const kbInserts = batch.map((chunk, idx) => ({
        title: chunks.length > 1 ? `${fileName} (parte ${i + idx + 1}/${chunks.length})` : fileName,
        content: chunk,
        source_type: "documento_upload",
        source_reference: storagePath,
        tags,
        user_id: userId,
        is_processed: true,
        embedding: `[${embeddings[idx].join(",")}]`,
      }));

      const leInserts = batch.map((chunk, idx) => ({
        title: chunks.length > 1 ? `${fileName} (parte ${i + idx + 1}/${chunks.length})` : fileName,
        content: chunk,
        source: "user_upload",
        source_label: "Upload do Advogado",
        content_type: category,
        url: null,
        published_date: new Date().toISOString().split("T")[0],
        metadata: { uploaded_by: userId, file_name: fileName, category, chunk_index: i + idx },
        embedding: `[${embeddings[idx].join(",")}]`,
        query_origin: `smart_ingest:${fileName}`,
      }));

      const { data: kbRows2 } = await supabaseAdmin.from("neural_knowledge_base").insert(kbInserts).select("id");
      await supabaseAdmin.from("legal_embeddings").insert(leInserts);
      indexed += batch.length;

      // Phase 1 dual-write: mirror to Zilliz (fire-and-forget)
      if (kbRows2?.length) {
        const { mirrorToZilliz } = await import("../_shared/zilliz-mirror.ts");
        mirrorToZilliz(kbRows2.map((r: any, idx: number) => ({
          id: r.id,
          text: `${kbInserts[idx].title}\n\n${kbInserts[idx].content}`,
          metadata: { source_type: kbInserts[idx].source_type, origin: "smart-ingest" },
        })));
      }

      if (i + BATCH < inlineLimit) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Step 6: Queue remaining chunks if any
    const remainingChunks = chunks.slice(indexed);
    let queued = false;

    if (remainingChunks.length > 0) {
      console.log(`📋 Enqueueing ${remainingChunks.length} remaining chunks for background processing`);
      
      // Split into queue jobs of max 50 chunks each to stay within payload limits
      const QUEUE_BATCH_SIZE = 50;
      for (let q = 0; q < remainingChunks.length; q += QUEUE_BATCH_SIZE) {
        const queueBatch = remainingChunks.slice(q, q + QUEUE_BATCH_SIZE);
        await supabaseAdmin.from("generation_queue").insert({
          user_id: userId,
          job_type: "large_pdf_embed",
          status: "pending",
          max_attempts: 5,
          params: {
            continuationChunks: queueBatch,
            continuationMeta: {
              fileName,
              storagePath,
              category,
              tags,
              chunkOffset: indexed + q,
              totalChunks: chunks.length,
            },
          },
          prompt: `Embedding: ${fileName} (chunks ${indexed + q + 1}-${Math.min(indexed + q + QUEUE_BATCH_SIZE, chunks.length)}/${chunks.length})`,
        });
      }
      queued = true;
    }

    clearTimeout(deadlineTimer);
    console.log(`${queued ? "📋" : "✅"} Smart Ingest v11: ${indexed}/${chunks.length} chunks indexed inline, ${remainingChunks.length} queued`);

    // ─── Background tasks ───
    const supabaseUrl2 = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    EdgeRuntime.waitUntil(
      (async () => {
        try {
          const supa = createClient(supabaseUrl2, serviceKey);
          await supa.from("neural_learning_data").insert({
            interaction_type: "document_upload",
            input_text: `${fileName} (${fileType}) — ${chunks.length} chunks, ${indexed} inline, ${remainingChunks.length} queued`,
            output_text: extractedText.substring(0, 5000),
            quality_score: Math.min(0.5 + (indexed / 20) * 0.3, 0.9),
            learned: indexed >= 3,
            metadata: {
              file_name: fileName, file_type: fileType, category, chunks: chunks.length,
              indexed, queued: remainingChunks.length, storage_path: storagePath, 
              autoScored: true, source: "smart_ingest_v11",
              extraction_method: extractionMethod, file_size_mb: (fileSize / 1024 / 1024).toFixed(1),
            },
          });

          // Trigger queue worker if we have queued jobs
          if (queued) {
            await fetch(`${supabaseUrl2}/functions/v1/queue-worker`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
              body: JSON.stringify({}),
              signal: AbortSignal.timeout(5000),
            }).catch(() => {});
          }

          await fetch(`${supabaseUrl2}/functions/v1/neural-pipeline-orchestrator`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ action: "collect_feedback" }),
            signal: AbortSignal.timeout(30000),
          }).catch(() => {});
        } catch (e) { console.warn("Background tasks failed:", e); }
      })()
    );

    return new Response(JSON.stringify({
      success: true,
      fileName,
      category,
      tags,
      totalChunks: chunks.length,
      indexed,
      queued: remainingChunks.length,
      textLength: extractedText.length,
      extractionMethod,
      fileSizeMB: +(fileSize / 1024 / 1024).toFixed(1),
      backgroundProcessing: queued,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    clearTimeout(deadlineTimer);
    console.error("Smart ingest error:", error);

    try {
      const body2 = await req.clone().json().catch(() => ({}));
      const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await logIngestionFailure(supa, body2?.fileName || "unknown", body2?.fileType || "unknown", error.message);
    } catch { /* ignore */ }

    const isTimeout = error.message?.includes("TIMEOUT") || error.name === "AbortError";
    return new Response(JSON.stringify({
      error: isTimeout 
        ? "Documento muito grande para processar de uma vez. Tente novamente — o sistema processará em lotes."
        : `Erro ao processar documento: ${error.message}`,
      timeout: isTimeout,
    }), { status: isTimeout ? 408 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
