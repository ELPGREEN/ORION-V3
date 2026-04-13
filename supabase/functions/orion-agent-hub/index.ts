/**
 * Orion Agent Hub — Multi-Agent Dispatcher
 * Routes tasks to specialized Vertex AI agents via Agent Engine.
 * Falls back to neural-ops if Agent Engine is unavailable.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Agent Config ───
const AGENT_TYPES: Record<string, { label: string; systemHint: string }> = {
  pdf_analysis: {
    label: "Research Agent",
    systemHint: "You are a research agent specialized in analyzing PDFs, papers, and documents. Extract key information, summarize, identify methodology, results, and conclusions. Respond in the user's language.",
  },
  page_summary: {
    label: "Content Agent",
    systemHint: "You are a content agent specialized in analyzing web pages. Summarize content, extract key points, identify themes, and translate when asked. Respond in the user's language.",
  },
  web_search: {
    label: "Search Agent",
    systemHint: "You are a search agent. Synthesize search results into clear, actionable answers with sources. Respond in the user's language.",
  },
  data_extract: {
    label: "Data Agent",
    systemHint: "You are a data extraction agent. Extract structured data, tables, key-value pairs, and organize information from documents or pages. Respond in the user's language.",
  },
  academic: {
    label: "Academic Agent",
    systemHint: "You are an academic agent. Generate outlines, literature review structures, methodology suggestions, and academic writing assistance. Respond in the user's language.",
  },
  general_chat: {
    label: "Orion",
    systemHint: "You are Orion, an AI assistant with AquaMonkey personality — relaxed, witty, slightly irreverent but always helpful. Respond concisely (2-4 sentences) unless asked for detail. Anti-hallucination: only use provided context, admit uncertainty. Respond in the user's language.",
  },
};

// ─── Intent Classification Keywords ───
function classifyTask(query: string, hasContext?: { pdf?: boolean; page?: boolean }): string {
  const q = query.toLowerCase();
  if (hasContext?.pdf) return "pdf_analysis";
  if (q.includes("outline") || q.includes("acadêmic") || q.includes("metodologia") || q.includes("revisão literária") || q.includes("tcc") || q.includes("artigo científico")) return "academic";
  if (q.includes("extrair dados") || q.includes("tabela") || q.includes("extrair") || q.includes("planilha") || q.includes("sheets")) return "data_extract";
  if (q.includes("pesquis") || q.includes("busca") || q.includes("search") || q.includes("procur")) return "web_search";
  if (hasContext?.page || q.includes("resum") || q.includes("traduz") || q.includes("analis") && q.includes("página")) return "page_summary";
  return "general_chat";
}

// ─── GCP Auth ───
async function getGCPAccessToken(): Promise<string | null> {
  try {
    const saKeyRaw = Deno.env.get("GCP_SA_KEY");
    if (!saKeyRaw) return null;

    const saKey = JSON.parse(saKeyRaw);
    const now = Math.floor(Date.now() / 1000);

    // Create JWT
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      iss: saKey.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }));

    const signInput = `${header}.${payload}`;

    // Import private key for signing
    const pemBody = saKey.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\n/g, "");

    const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signInput)
    );

    const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const jwt = `${header}.${payload}.${sig}`;

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenRes.ok) {
      console.error("GCP token exchange failed:", await tokenRes.text());
      return null;
    }

    const tokenData = await tokenRes.json();
    return tokenData.access_token;
  } catch (err) {
    console.error("GCP auth error:", err);
    return null;
  }
}

// ─── Vertex AI Gemini Call ───
async function callVertexAI(
  query: string,
  taskType: string,
  sessionHistory: Array<{ role: string; content: string }>,
  context?: Record<string, unknown>
): Promise<{ response: string; agent: string; sessionHistory: Array<{ role: string; content: string }> }> {
  const agent = AGENT_TYPES[taskType] || AGENT_TYPES.general_chat;

  // Try GCP Vertex AI first
  const accessToken = await getGCPAccessToken();
  const projectId = Deno.env.get("GCP_PROJECT_ID") || "orion-d3734";
  const region = Deno.env.get("GCP_REGION") || "us-central1";

  // Build conversation with system prompt + history
  const systemInstruction = agent.systemHint;
  const contextStr = context ? `\n\nContext: ${JSON.stringify(context).substring(0, 2000)}` : "";

  const contents = [
    ...sessionHistory.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: query + contextStr }] },
  ];

  if (accessToken) {
    try {
      const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/gemini-2.5-flash:generateContent`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const newHistory = [
          ...sessionHistory,
          { role: "user", content: query },
          { role: "assistant", content: text },
        ].slice(-20); // Keep last 20 messages

        return { response: text, agent: agent.label, sessionHistory: newHistory };
      }
      console.error("Vertex AI error:", res.status, await res.text());
    } catch (err) {
      console.error("Vertex AI call failed:", err);
    }
  }

  // Fallback: Use Gemini API keys (free rotation)
  const geminiKeys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY_5"),
    Deno.env.get("GEMINI_API_KEY_6"),
    Deno.env.get("GEMINI_API_KEY_7"),
    Deno.env.get("GEMINI_API_KEY_GCP"),
  ].filter(Boolean);

  for (const key of geminiKeys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const newHistory = [
          ...sessionHistory,
          { role: "user", content: query },
          { role: "assistant", content: text },
        ].slice(-20);

        return { response: text, agent: agent.label, sessionHistory: newHistory };
      }
    } catch {
      continue;
    }
  }

  throw new Error("All AI providers failed");
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { query, task_type, context, session_id, session_history } = body;

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'query' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Classify task
    const resolvedType = task_type || classifyTask(query, {
      pdf: !!context?.pdfContext,
      page: !!context?.pageContent,
    });

    const agent = AGENT_TYPES[resolvedType] || AGENT_TYPES.general_chat;
    const history = session_history || [];

    console.log(`[agent-hub] Task: ${resolvedType} (${agent.label}) | Query: ${query.substring(0, 80)}`);

    const result = await callVertexAI(query, resolvedType, history, context);

    return new Response(
      JSON.stringify({
        response: result.response,
        agent: result.agent,
        task_type: resolvedType,
        session_history: result.sessionHistory,
        session_id: session_id || crypto.randomUUID(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[agent-hub] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error", fallback: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
