import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { imageBase64, imageUrl, mimeType: clientMimeType } = body;

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Provide imageBase64 or imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imgData = await prepareImageData(imageBase64, imageUrl, clientMimeType);
    console.log(`📄 OCR request: mimeType=${imgData.mimeType}, base64Length=${imgData.base64.length}`);

    const isPdf = imgData.mimeType === "application/pdf";

    // Groq Vision (free) first for images, then paid providers as fallback
    const providers = isPdf
      ? [
          { name: "anthropic", fn: () => tryAnthropic(imgData) },
          { name: "gemini", fn: () => tryGemini(imgData) },
          { name: "groq", fn: () => tryGroq(imgData) }
        ]
      : [
          { name: "groq", fn: () => tryGroq(imgData) },
          { name: "openai", fn: () => tryOpenAI(imgData) },
          { name: "anthropic", fn: () => tryAnthropic(imgData) },
          { name: "gemini", fn: () => tryGemini(imgData) }
        ];

    for (const provider of providers) {
      try {
        const result = await provider.fn();
        console.log(`✅ OCR via ${provider.name}`);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.warn(`⚠️ OCR ${provider.name} failed:`, (e as Error).message);
      }
    }

    throw new Error("All OCR providers failed");
  } catch (error) {
    console.error("OCR error:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ImageData {
  base64: string;
  mimeType: string;
}

async function prepareImageData(imageBase64?: string, imageUrl?: string, clientMimeType?: string): Promise<ImageData> {
  if (imageBase64) {
    const mime = clientMimeType || "image/png";
    return { base64: imageBase64, mimeType: mime };
  }
  if (imageUrl) {
    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
    const mimeType = resp.headers.get("content-type") || "image/png";
    const buffer = await resp.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return { base64, mimeType };
  }
  throw new Error("No image data");
}

// ─── Document AI: Classification ───
// Inspired by Document AI taxonomy (LayoutLM, DiT concepts)
// Uses extracted text patterns to classify Brazilian legal documents
const DOCUMENT_CATEGORIES: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  { key: "rg", label: "RG — Registro Geral", patterns: [/registro\s+geral/i, /secretaria\s+(de\s+)?seguran[cç]a/i, /identidade/i] },
  { key: "cnh", label: "CNH — Carteira de Motorista", patterns: [/carteira\s+nacional\s+de\s+habilita[cç][aã]o/i, /habilitado\s+na\s+categoria/i, /DETRAN/i] },
  { key: "cpf", label: "CPF", patterns: [/cadastro\s+de\s+pessoas?\s+f[ií]sicas?/i, /minist[eé]rio\s+da\s+fazenda/i] },
  { key: "passaporte", label: "Passaporte", patterns: [/passaporte/i, /passport/i, /pol[ií]cia\s+federal/i] },
  { key: "ctps", label: "CTPS — Carteira de Trabalho", patterns: [/carteira\s+de\s+trabalho/i, /minist[eé]rio\s+do\s+trabalho/i, /CTPS/] },
  { key: "comprovante_residencia", label: "Comprovante de Residência", patterns: [/comprovante\s+de\s+resid[eê]ncia/i, /fatura|conta\s+de\s+(luz|[aá]gua|g[aá]s|telefone|internet)/i, /endere[cç]o\s+de\s+entrega/i] },
  { key: "certidao_nascimento", label: "Certidão de Nascimento", patterns: [/certid[aã]o\s+de\s+nascimento/i, /registro\s+civil/i] },
  { key: "certidao_casamento", label: "Certidão de Casamento", patterns: [/certid[aã]o\s+de\s+casamento/i, /matrim[oô]nio/i] },
  { key: "certidao_obito", label: "Certidão de Óbito", patterns: [/certid[aã]o\s+de\s+[oó]bito/i, /falecimento/i] },
  { key: "procuracao", label: "Procuração", patterns: [/procura[cç][aã]o/i, /outorgante|outorgado/i, /ad\s+judicia/i] },
  { key: "contrato", label: "Contrato", patterns: [/contrato\s+de/i, /contratante|contratado/i, /cl[aá]usula\s+(primeira|segunda)/i] },
  { key: "comprovante_renda", label: "Comprovante de Renda", patterns: [/comprovante\s+de\s+renda/i, /holerite|contracheque/i, /demonstrativo\s+de\s+pagamento/i] },
  // Peças jurídicas
  { key: "peticao_inicial", label: "Petição Inicial", patterns: [/peti[cç][aã]o\s+inicial/i, /meritissimo|excelent[ií]ssimo/i] },
  { key: "habeas_corpus", label: "Habeas Corpus", patterns: [/habeas\s+corpus/i, /paciente.*coator/i, /liberdade\s+de\s+locomo[cç][aã]o/i] },
  { key: "recurso", label: "Recurso", patterns: [/recurso\s+(de\s+)?(apela[cç][aã]o|especial|extraordin[aá]rio|ordin[aá]rio)/i] },
  { key: "contestacao", label: "Contestação", patterns: [/contesta[cç][aã]o/i, /r[eé]u.*contesta/i] },
  { key: "sentenca", label: "Sentença", patterns: [/senten[cç]a/i, /julgo\s+(procedente|improcedente)/i] }
];

function classifyDocument(text: string): { category: string; label: string; confidence: number } {
  const sample = text.substring(0, 3000).toLowerCase();
  let bestMatch = { category: "outros", label: "Outros", confidence: 0 };

  for (const cat of DOCUMENT_CATEGORIES) {
    let matchCount = 0;
    for (const pattern of cat.patterns) {
      if (pattern.test(sample)) matchCount++;
    }
    if (matchCount > 0) {
      const confidence = Math.min(0.95, 0.5 + (matchCount / cat.patterns.length) * 0.45);
      if (confidence > bestMatch.confidence) {
        bestMatch = { category: cat.key, label: cat.label, confidence };
      }
    }
  }

  return bestMatch;
}

// ─── LayoutLM Configuration (microsoft/layoutlm-base-uncased defaults) ───
const LAYOUTLM_CONFIG = {
  vocab_size: 30522,
  hidden_size: 768,
  num_hidden_layers: 12,
  num_attention_heads: 12,
  intermediate_size: 3072,
  hidden_act: "gelu",
  hidden_dropout_prob: 0.1,
  attention_probs_dropout_prob: 0.1,
  max_position_embeddings: 512,
  type_vocab_size: 2,
  initializer_range: 0.02,
  layer_norm_eps: 1e-12,
  pad_token_id: 0,
  max_2d_position_embeddings: 1024,
  tie_word_embeddings: true,
  classification_model: "microsoft/layoutlmv3-base",
  document_qa_model: "impira/layoutlm-document-qa",
};

async function tryLayoutLMClassification(img: ImageData): Promise<{ category: string; label: string; confidence: number } | null> {
  const hfToken = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_API_KEY");
  if (!hfToken) return null;
  
  try {
    const imageBytes = Uint8Array.from(atob(img.base64), c => c.charCodeAt(0));
    
    const resp = await fetch(
      `https://api-inference.huggingface.co/models/${LAYOUTLM_CONFIG.classification_model}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfToken}` },
        body: imageBytes,
      }
    );
    
    if (!resp.ok) {
      console.warn(`LayoutLM HF API [${resp.status}]`);
      return null;
    }
    
    const results = await resp.json();
    console.log(`🧠 LayoutLM config: hidden=${LAYOUTLM_CONFIG.hidden_size}, layers=${LAYOUTLM_CONFIG.num_hidden_layers}, heads=${LAYOUTLM_CONFIG.num_attention_heads}, max2d=${LAYOUTLM_CONFIG.max_2d_position_embeddings}`);
    
    if (Array.isArray(results) && results.length > 0) {
      const top = results[0];
      return {
        category: (top.label || "outros").toLowerCase().replace(/\s+/g, "_"),
        label: top.label || "Outros",
        confidence: top.score || 0.5,
      };
    }
  } catch (e) {
    console.warn("LayoutLM classification failed:", (e as Error).message);
  }
  return null;
}

async function tryLayoutLMDocumentQA(img: ImageData, question: string): Promise<string | null> {
  const hfToken = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_API_KEY");
  if (!hfToken) return null;

  try {
    const resp = await fetch(
      `https://api-inference.huggingface.co/models/${LAYOUTLM_CONFIG.document_qa_model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {
            image: `data:${img.mimeType};base64,${img.base64}`,
            question,
          },
          parameters: {
            max_seq_length: LAYOUTLM_CONFIG.max_position_embeddings,
          },
        }),
      }
    );
    
    if (!resp.ok) return null;
    const results = await resp.json();
    if (Array.isArray(results) && results.length > 0) {
      return results[0].answer || null;
    }
  } catch (e) {
    console.warn("LayoutLM QA failed:", (e as Error).message);
  }
  return null;
}

async function buildResult(fullText: string, provider: string, img?: ImageData) {
  // Phase 1: Regex-based classification (fast, local)
  const regexClassification = classifyDocument(fullText);
  
  // Phase 2: If regex confidence is low, try LayoutLM via HF for enhanced classification
  let classification = regexClassification;
  let layoutlmEnhanced = false;
  
  if (regexClassification.confidence < 0.7 && img && img.mimeType !== "application/pdf") {
    const layoutlmResult = await tryLayoutLMClassification(img);
    if (layoutlmResult && layoutlmResult.confidence > regexClassification.confidence) {
      classification = layoutlmResult;
      layoutlmEnhanced = true;
      console.log(`🧠 LayoutLM enhanced classification: ${classification.label} (${classification.confidence})`);
    }
  }

  // Phase 3: Extract key fields via LayoutLM Document QA (if available & image)
  let extractedFields: Record<string, string> = {};
  if (img && img.mimeType !== "application/pdf") {
    const questions = [
      { key: "nome", q: "What is the person's name?" },
      { key: "cpf", q: "What is the CPF number?" },
      { key: "data", q: "What is the date?" },
      { key: "numero_documento", q: "What is the document number?" }
    ];
    
    const fieldPromises = questions.map(async ({ key, q }) => {
      const answer = await tryLayoutLMDocumentQA(img, q);
      if (answer) extractedFields[key] = answer;
    });
    
    // Run in parallel, don't block if fails
    await Promise.allSettled(fieldPromises);
  }

  return {
    fullText,
    confidence: provider === "openai" ? 0.92 : provider === "anthropic" ? 0.90 : provider === "groq" ? 0.88 : 0.85,
    wordCount: fullText.split(/\s+/).filter(Boolean).length,
    lineCount: fullText.split("\n").filter(Boolean).length,
    language: "pt",
    provider,
    blocks: [],
    classification,
    layoutlmEnhanced,
    extractedFields: Object.keys(extractedFields).length > 0 ? extractedFields : undefined,
  };
}

const OCR_PROMPT = "Extract ALL text from this document/image exactly as it appears, preserving formatting, line breaks, paragraphs, and structure. Return ONLY the extracted text, nothing else.";

async function tryGroq(img: ImageData) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("No Groq key");

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.2-90b-vision-preview",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: OCR_PROMPT },
          { type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.base64}` } }
        ],
      }],
      max_tokens: 8192,
      temperature: 0.1,
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Groq [${resp.status}]: ${errBody.substring(0, 300)}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Empty Groq response");
  return await buildResult(text, "groq", img);
}

async function tryOpenAI(img: ImageData) {
  // Use Gemini Vision instead (FREE)
  const geminiKeys = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"].map(n => Deno.env.get(n)).filter((k): k is string => !!k);
  if (!geminiKeys.length) throw new Error("No Gemini keys");

  for (const key of geminiKeys) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [
              { text: OCR_PROMPT },
              { inlineData: { mimeType: img.mimeType, data: img.base64 } }
            ] }],
            generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
          }),
        }
      );
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) continue;
      return await buildResult(text, "gemini", img);
    } catch { continue; }
  }
  throw new Error("Gemini OCR failed");
}

async function tryAnthropic(img: ImageData) {
  // Anthropic removed — use Gemini instead (routed through tryOpenAI/tryGemini)
  throw new Error("Anthropic disabled — using Gemini FREE");
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("No Anthropic key");

  // Anthropic supports: image/jpeg, image/png, image/gif, image/webp, application/pdf
  const supportedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
  const mediaType = supportedTypes.includes(img.mimeType) ? img.mimeType : "image/png";

  const sourceBlock = img.mimeType === "application/pdf"
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf", data: img.base64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: img.base64 } };

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: [
          sourceBlock,
          { type: "text", text: OCR_PROMPT }
        ],
      }],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Anthropic [${resp.status}]: ${errBody.substring(0, 300)}`);
  }
  const data = await resp.json();
  const text = data.content?.[0]?.text || "";
  if (!text) throw new Error("Empty Anthropic response");
  return await buildResult(text, "anthropic", img);
}

async function tryGemini(img: ImageData) {
  const keys = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"].map(n => Deno.env.get(n)).filter(Boolean) as string[];
  if (!keys.length) throw new Error("No Gemini keys");

  for (const key of keys) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: OCR_PROMPT },
              { inline_data: { mime_type: img.mimeType, data: img.base64 } }
            ]}],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
          }),
        }
      );
      if (!resp.ok) {
        const errBody = await resp.text();
        console.warn(`Gemini [${resp.status}]:`, errBody.substring(0, 300));
        continue;
      }
      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) continue;
      return await buildResult(text, "gemini", img);
    } catch { continue; }
  }
  throw new Error("All Gemini keys failed");
}
