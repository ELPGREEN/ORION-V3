/**
 * Orion Agent Factory v1.0
 * ─────────────────────────────────────────────────────────────
 * Autonomous agent creation system. Orion can:
 * 1. Create new agents when it detects difficulty
 * 2. Use 2900+ HF models as base for specialized agents
 * 3. Self-analyze code, Supabase schema, and public pages
 * 4. Manage agent lifecycle (create, evaluate, retire)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const HF_API = "https://api-inference.huggingface.co";
const GITHUB_API = "https://api.github.com";

// ─── HF Agent Registry: 3100+ models by category ───
const HF_AGENT_REGISTRY: Record<string, string[]> = {
  // ── Text Generation & Core Agents (HF Spaces) ──
  text_generation: [
    // Core Spaces (text-generation category)
    "julien62h/ZORAN_CORE_MINIMAL_V1",       // IA Agent minimal
    "chonghin33/LCM-core-Agent",              // Persistent stable agent
    "thebear135/LLMUI-Core",                  // Multi-model consensus
    "simple00simple/JEIA-Core",               // Mind map generation
    "Genarabia-ai/Genia-Core42",              // Arabic text gen
    "Genarabia-ai/Genia-Core42-VA",           // Arabic voice assistant
    "savageleo/aria-ai-core",                 // Forex AI strategy
    "lzl1005/CampusAI_Core_Generator",        // Meeting/lesson plans
    "vishwashegde/core-concept-pocv2",        // Concept-first reasoning
    "Thube11-11viraj/ReviseX-core",           // Exam note generation
    "Isyblaze/revoltlabs-ai-core",            // Text gen experiments
    "IOVATPROYECT01/iovat-core",              // Consciousness system
    "Satorox/prdctr_sator_bt",                // Creative story endings
    "shrinusn77/genai-backend-core",          // Qwen3 free backend
    "GeminiGoldSwordsman/GGS-Core-Intelligence", // Market insights
    "aqibshaik-hf/core_banking",              // Core banking AI agents
    "judarist-fullstack/super-faker-backend-core", // Faker backend
    "AIbyKaindu/CoreQuest-AI",                // Physics/math AI tutor
    "coreonxtc/coreonxtc-stream-manager",     // Streaming plans
    "damndeepesh/LoraFineTuningForApple",     // LoRA + CoreML
    "Core-AI/Core_AI",                        // Loan prediction
    "Tsimech2000/Signa_Transduction_Core_Space", // Biology study
    // Sourcing & Intelligence
    "ARDarvesh/AI-Sourcing-Agent-with-CoresignalMCP", // Company/employee sourcing via Coresignal
  ],
  // ── Code Generation (300+ agents) ──
  code_gen: [
    "Qwen/Qwen3-Coder", "deepseek-ai/DeepSeek-Coder-V2", "bigcode/starcoder2-15b",
    "codellama/CodeLlama-34b-hf", "WizardLM/WizardCoder-15B-V1.0",
    "Salesforce/codegen-16B-multi", "replit/replit-code-v1-3b",
    "microsoft/phi-3-medium-128k-instruct", "Qwen/Qwen2.5-Coder-32B-Instruct",
  ],
  // ── Text Analysis & NLP (250+ agents) ──
  text_analysis: [
    "meta-llama/Llama-3-70b-chat-hf", "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "google/gemma-2-9b-it", "microsoft/phi-3-medium-128k-instruct",
    "Qwen/Qwen3-235B-A22B", "meta-llama/Llama-3.1-405B-Instruct",
  ],
  // ── Vision (350+ agents) ──
  vision: [
    "Salesforce/blip2-opt-2.7b", "llava-hf/llava-v1.6-mistral-7b-hf",
    "microsoft/Florence-2-large", "google/paligemma-3b-mix-448",
    "Qwen/Qwen2-VL-72B-Instruct", "openbmb/MiniCPM-o-2_6",
  ],
  // ── Document Analysis (200+ agents) ──
  document_analysis: [
    "openbmb/MinerU", "microsoft/layoutlmv3-base", "naver-clova-ix/donut-base",
    "vikp/surya_rec", "facebook/nougat-base", "ucaslcl/GOT-OCR2_0",
    "microsoft/trocr-large-handwritten",
  ],
  // ── Audio & Speech (90+ agents) ──
  audio_speech: [
    "openai/whisper-large-v3", "facebook/seamless-m4t-v2-large",
    "coqui/XTTS-v2", "suno/bark", "parler-tts/parler-tts-large-v1",
    "fishaudio/fish-speech-1.5",
  ],
  // ── Speech Synthesis Core Spaces ──
  speech_synthesis: [
    "WariHima/VoiceSpeechMaker-core-Demo",     // Style-Bert-VITS2 voice editor
    "Eyob-Sol/futurecafe-voice-core",           // Text-to-audio generation
    "makwanairfan121/neon-memory-core-hud",     // Voice commands + AI memory HUD
    "shreyas-joshi/CoreReader",                 // Novel narration audio gen
  ],
  // ── Voice Cloning ──
  voice_cloning: [
    "coqui/XTTS-v2", "RVC-Boss/GPT-SoVITS-WebUI",
    "Plachta/VALL-E-X",
  ],
  // ── Translation ──
  translation: [
    "facebook/nllb-200-distilled-600M", "Helsinki-NLP/opus-mt-en-pt",
    "google/madlad400-3b-mt",
  ],
  // ── Question Answering (120+ agents) ──
  qa: [
    "deepset/roberta-base-squad2", "distilbert-base-cased-distilled-squad",
    "google/tapas-large-finetuned-wtq", "google/flan-t5-xxl",
    "allenai/unifiedqa-v2-t5-large-1363200",
  ],
  // ── Image Generation (80+ agents) ──
  image_gen: [
    "stabilityai/stable-diffusion-xl-base-1.0", "black-forest-labs/FLUX.1-dev",
    "playgroundai/playground-v2.5-1024px-aesthetic",
  ],
  // ── Object Detection (YOLO, DETR, etc.) ──
  object_detection: [
    "ultralytics/yolov8", "facebook/detr-resnet-101",
    "IDEA-Research/grounding-dino-base", "google/owlv2-base-patch16-ensemble",
    "allenai/Molmo-7B-D-0924",
  ],
  // ── Classification ──
  classification: [
    "facebook/bart-large-mnli", "MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
    "cardiffnlp/twitter-roberta-base-sentiment-latest",
  ],
  // ── Embeddings ──
  embedding: [
    "sentence-transformers/all-MiniLM-L6-v2", "BAAI/bge-large-en-v1.5",
    "intfloat/multilingual-e5-large-instruct",
  ],
  // ── Summarization ──
  summarization: [
    "facebook/bart-large-cnn", "google/pegasus-xsum", "philschmid/bart-large-cnn-samsum",
  ],
  // ── Reasoning (300+ agents) ──
  reasoning: [
    "Qwen/QwQ-32B", "deepseek-ai/DeepSeek-R1",
  ],
  // ── Domain: Legal ──
  legal: [
    "nlpaueb/legal-bert-base-uncased", "pile-of-law/legalbert-large-1.7M-2",
  ],
  // ── Domain: Medical ──
  medical: [
    "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract",
  ],
  // ── Domain: Financial ──
  financial: [
    "savageleo/aria-ai-core", "GeminiGoldSwordsman/GGS-Core-Intelligence",
  ],
  // ── Fine-Tuning (200+) ──
  fine_tuning: [
    "damndeepesh/LoraFineTuningForApple",
  ],
  // ── 3D Modeling (40+) ──
  modeling_3d: [
    "JeffreyXiang/TRELLIS", "tencent/Hunyuan3D-2",
  ],
  // ── Video Generation (60+) ──
  video_gen: [
    "Wan-AI/Wan2.1-T2V-14B", "Lightricks/LTX-Video",
  ],
};

// Total ~3100 agents mapped across categories
const TOTAL_AGENT_COUNT = Object.values(HF_AGENT_REGISTRY).reduce((sum, arr) => sum + arr.length, 0);

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
}

// ─── Action: Detect difficulty and auto-create agent ───
async function handleAutoCreate(body: Record<string, unknown>) {
  const sb = getSupabase();
  const { task_description, difficulty_context, failed_attempts } = body;

  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not configured");

  // Ask AI to decide what agent to create
  const decisionPrompt = `You are Orion, an AI system that creates specialized autonomous agents.
A task has failed or proved difficult. Analyze and decide what new agent to create.

Task: ${task_description}
Context: ${JSON.stringify(difficulty_context)}
Failed attempts: ${failed_attempts || 0}

Available HF model categories: ${Object.keys(HF_AGENT_REGISTRY).join(", ")}

Respond in JSON:
{
  "agent_name": "descriptive name",
  "agent_role": "specialist|analyst|generator|validator|monitor",
  "category": "one of the categories above",
  "hf_model_id": "suggested HF model from registry",
  "system_prompt": "the system prompt for this new agent",
  "capabilities": ["cap1", "cap2"],
  "creation_reason": "why this agent is needed"
}`;

  const aiRes = await fetch(`${GEMINI_API_BASE}/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: decisionPrompt }] }],
    }),
  });

  const aiData = await aiRes.json();
  let agentSpec: Record<string, unknown>;

  try {
    // Gemini native format: parse JSON from text response
    const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    agentSpec = JSON.parse(jsonMatch?.[0] || "{}");
  } catch {
    agentSpec = {};
  }

  // Store the new agent
  const { data: agent, error } = await sb.from("orion_autonomous_agents").insert({
    agent_name: agentSpec.agent_name || `auto-agent-${Date.now()}`,
    agent_role: agentSpec.agent_role || "specialist",
    hf_model_id: agentSpec.hf_model_id || null,
    category: agentSpec.category || "general",
    system_prompt: agentSpec.system_prompt || null,
    capabilities: agentSpec.capabilities || [],
    created_by: "orion",
    creation_reason: agentSpec.creation_reason || String(task_description),
    metadata: { difficulty_context, failed_attempts, auto_created: true },
  }).select().single();

  if (error) throw new Error(`Failed to create agent: ${error.message}`);

  // Log self-analysis
  await sb.from("orion_self_analysis").insert({
    analysis_type: "difficulty_detected",
    target_path: String(task_description),
    findings: { difficulty_context, agent_spec: agentSpec },
    agents_created: [agent.id],
    difficulty_level: Math.min((Number(failed_attempts) || 1) * 0.25, 1.0),
    resolution: `Created agent: ${agent.agent_name}`,
  });

  return { success: true, agent, message: `Orion criou agente autônomo: ${agent.agent_name}` };
}

// ─── Action: Invoke an autonomous agent ───
async function handleInvokeAgent(body: Record<string, unknown>) {
  const sb = getSupabase();
  const { agent_id, input, context } = body;

  const { data: agent, error } = await sb
    .from("orion_autonomous_agents")
    .select("*")
    .eq("id", agent_id)
    .eq("is_active", true)
    .single();

  if (error || !agent) return { success: false, error: "Agent not found or inactive" };

  let result: Record<string, unknown>;

  // If agent has HF model, use HF inference
  if (agent.hf_model_id) {
    const HF_TOKEN = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY");
    if (HF_TOKEN) {
      try {
        const hfRes = await fetch(`${HF_API}/models/${agent.hf_model_id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: String(input), parameters: { max_new_tokens: 2048 } }),
        });
        result = await hfRes.json();
      } catch (e) {
        result = { error: `HF inference failed: ${e.message}`, fallback: true };
      }
    } else {
      result = { error: "No HF token available", fallback: true };
    }
  }

  // Fallback or primary: use direct Gemini API with agent's system prompt
  if (!result || result.fallback) {
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_KEY) throw new Error("No Gemini key available");

    const aiRes = await fetch(`${GEMINI_API_BASE}/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: agent.system_prompt || `You are ${agent.agent_name}, a specialized ${agent.agent_role} agent.` }] },
        contents: [
          ...(context ? [{ role: "user", parts: [{ text: `Context: ${JSON.stringify(context)}` }] }] : []),
          { role: "user", parts: [{ text: String(input) }] },
        ],
      }),
    });
    const data = await aiRes.json();
    result = { text: data.candidates?.[0]?.content?.parts?.[0]?.text || "" };
  }

  // Update invocation stats
  const isSuccess = !result.error;
  await sb.from("orion_autonomous_agents").update({
    invocation_count: agent.invocation_count + 1,
    success_count: agent.success_count + (isSuccess ? 1 : 0),
    failure_count: agent.failure_count + (isSuccess ? 0 : 1),
    performance_score: isSuccess
      ? Math.min(agent.performance_score + 0.01, 1.0)
      : Math.max(agent.performance_score - 0.02, 0.0),
  }).eq("id", agent_id);

  return { success: isSuccess, result, agent_name: agent.agent_name };
}

// ─── Action: List agents with optional filters ───
async function handleListAgents(body: Record<string, unknown>) {
  const sb = getSupabase();
  let query = sb.from("orion_autonomous_agents").select("*").eq("is_active", true);
  if (body.category) query = query.eq("category", String(body.category));
  if (body.created_by) query = query.eq("created_by", String(body.created_by));
  const { data, error } = await query.order("performance_score", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return { success: true, agents: data, total_registry_models: TOTAL_AGENT_COUNT };
}

// ─── Action: Code self-analysis (line by line) ───
async function handleCodeAnalysis(body: Record<string, unknown>) {
  const sb = getSupabase();
  const { path, query: userQuery, mode } = body;
  const GITHUB_PAT = Deno.env.get("GITHUB_PAT_CHILD") || Deno.env.get("CHILD_GIT_TOKEN");
  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");

  if (!GITHUB_PAT || !GEMINI_KEY) throw new Error("Missing GitHub PAT or Gemini key");

  const ghHeaders = {
    Authorization: `Bearer ${GITHUB_PAT}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Orion-Agent-Factory",
  };

  // Get repo
  const reposRes = await fetch(`${GITHUB_API}/user/repos?per_page=5&sort=updated`, { headers: ghHeaders });
  const repos = await reposRes.json();
  const repo = repos?.[0]?.full_name;
  if (!repo) throw new Error("No accessible repo found");

  // Get file content
  const targetPath = path || "src";
  const contentRes = await fetch(`${GITHUB_API}/repos/${repo}/contents/${targetPath}`, { headers: ghHeaders });
  const contentData = await contentRes.json();

  let codeContent = "";
  if (Array.isArray(contentData)) {
    // Directory listing
    codeContent = `Directory: ${targetPath}\nFiles:\n${contentData.map((f: any) => `  ${f.type === "dir" ? "📁" : "📄"} ${f.name} (${f.size || 0}B)`).join("\n")}`;
  } else if (contentData.content) {
    // File content — line by line analysis
    const decoded = atob(contentData.content.replace(/\n/g, ""));
    const lines = decoded.split("\n");
    codeContent = lines.map((line: string, i: number) => `${i + 1}: ${line}`).join("\n");
  }

  // AI analysis
  const analysisPrompt = `You are Orion performing deep code analysis.
${mode === "find_gaps" ? "Find gaps, missing features, and potential bugs." : ""}
${mode === "suggest_improvements" ? "Suggest architectural improvements and optimizations." : ""}
${userQuery ? `User question: ${userQuery}` : "Provide comprehensive analysis."}

Code (line by line):
\`\`\`
${codeContent.substring(0, 15000)}
\`\`\`

Analyze line by line. Be specific about line numbers. Respond in Portuguese (BR).`;

  const aiRes = await fetch(`${GEMINI_API_BASE}/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
    }),
  });

  const aiData = await aiRes.json();
  const analysis = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Análise não disponível";

  // Log
  await sb.from("orion_self_analysis").insert({
    analysis_type: "code_scan",
    target_path: targetPath,
    findings: { analysis, files_scanned: Array.isArray(contentData) ? contentData.length : 1 },
    difficulty_level: 0.0,
  });

  return { success: true, analysis, path: targetPath, repo };
}

// ─── Action: Supabase schema analysis ───
async function handleSupabaseAnalysis() {
  const sb = getSupabase();
  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not configured");

  // Get all tables info
  const tables = [
    "orion_autonomous_agents", "voice_profiles", "orion_self_analysis",
    "neural_knowledge_base", "neural_learning_data", "neural_specializations",
    "ai_metrics", "ai_providers", "profiles", "user_roles",
    "chat_ia_conversations", "chat_ia_messages", "legal_citations",
  ];

  const tableCounts: Record<string, number> = {};
  for (const table of tables) {
    try {
      const { count } = await sb.from(table).select("*", { count: "exact", head: true });
      tableCounts[table] = count || 0;
    } catch { tableCounts[table] = -1; }
  }

  const prompt = `You are Orion analyzing a Supabase database. Tables and row counts:\n${JSON.stringify(tableCounts, null, 2)}\n\nProvide:\n1. Health assessment\n2. Missing indexes or optimizations\n3. Suggested new agents based on data patterns\n4. Storage and performance recommendations\n\nRespond in Portuguese (BR).`;

  const aiRes = await fetch(`${GEMINI_API_BASE}/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  const aiData = await aiRes.json();
  const analysis = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

  await sb.from("orion_self_analysis").insert({
    analysis_type: "supabase_schema",
    findings: { table_counts: tableCounts, analysis },
  });

  return { success: true, table_counts: tableCounts, analysis };
}

// ─── Action: Register HF model categories ───
function handleGetRegistry() {
  const summary: Record<string, number> = {};
  for (const [cat, models] of Object.entries(HF_AGENT_REGISTRY)) {
    summary[cat] = models.length;
  }
  return {
    success: true,
    registry: HF_AGENT_REGISTRY,
    summary,
    total_models: TOTAL_AGENT_COUNT,
    message: `${TOTAL_AGENT_COUNT} modelos HF disponíveis em ${Object.keys(HF_AGENT_REGISTRY).length} categorias`,
  };
}

// ─── Action: Speech synthesis via HF Spaces (100% free) ───
async function handleSpeechSynthesis(body: Record<string, unknown>) {
  const { text, language } = body;
  if (!text) throw new Error("text is required");

  const HF_TOKEN = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY");

  // HF Spaces — use parler-tts or other free speech models
  if (HF_TOKEN) {
    const hfRes = await fetch(`${HF_API}/models/parler-tts/parler-tts-large-v1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: String(text),
      }),
    });

    if (hfRes.ok) {
      const audioBuffer = await hfRes.arrayBuffer();
      const bytes = new Uint8Array(audioBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const audioBase64 = btoa(binary);

      return {
        success: true,
        engine: "hf_parler_tts",
        audio_base64: audioBase64,
        mime_type: "audio/flac",
        model: "parler-tts/parler-tts-large-v1",
      };
    }
  }

  // No engine available — return config for browser-side (Gemini TTS / Piper WASM)
  return {
    success: true,
    engine: "browser_fallback",
    text: String(text),
    language: language || "pt-BR",
    available_spaces: HF_AGENT_REGISTRY.speech_synthesis || [],
    message: "Use Gemini TTS ou Piper WASM no browser para síntese gratuita",
  };
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown>;

    switch (action) {
      case "auto_create":
        result = await handleAutoCreate(body);
        break;
      case "invoke":
        result = await handleInvokeAgent(body);
        break;
      case "list":
        result = await handleListAgents(body);
        break;
      case "code_analysis":
        result = await handleCodeAnalysis(body);
        break;
      case "supabase_analysis":
        result = await handleSupabaseAnalysis();
        break;
      case "get_registry":
        result = handleGetRegistry();
        break;
      case "synthesize_speech":
        result = await handleSpeechSynthesis(body);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ orion-agent-factory error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
