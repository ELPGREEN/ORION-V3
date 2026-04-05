import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const { api_source, endpoint, method, headers: customHeaders, body: reqBody } = await req.json();

    if (!api_source || typeof api_source !== "string") {
      return new Response(JSON.stringify({ error: "api_source is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(endpoint ? `${api_source.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}` : api_source);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the API
    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: { "Accept": "application/json", ...customHeaders },
    };
    if (reqBody && method !== "GET") {
      fetchOptions.body = JSON.stringify(reqBody);
      (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
    }

    const resp = await fetch(url.toString(), fetchOptions);
    const contentType = resp.headers.get("content-type") || "";
    let responseData: unknown;

    if (contentType.includes("json")) {
      responseData = await resp.json();
    } else {
      responseData = await resp.text();
    }

    // Extract code snippets from response
    const snippets: Array<{ title: string; code: string; language: string }> = [];
    const responseStr = typeof responseData === "string" ? responseData : JSON.stringify(responseData, null, 2);

    // Extract JSON structures as snippets
    if (typeof responseData === "object" && responseData !== null) {
      const keys = Object.keys(responseData as Record<string, unknown>);
      for (const key of keys.slice(0, 10)) {
        const value = (responseData as Record<string, unknown>)[key];
        snippets.push({
          title: `${url.hostname} — ${key}`,
          code: JSON.stringify(value, null, 2),
          language: "json",
        });
      }
    }

    // If it's text/code, store as single snippet
    if (typeof responseData === "string" && responseData.length > 10) {
      snippets.push({
        title: `${url.hostname} — Response`,
        code: responseData.substring(0, 10000),
        language: contentType.includes("html") ? "html" : "text",
      });
    }

    // Store in code_snippets table
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let stored = 0;
    for (const snippet of snippets) {
      const { error } = await supabase.from("code_snippets").insert({
        title: snippet.title,
        code: snippet.code,
        language: snippet.language,
        category: "extracted",
        description: `Extracted from ${url.hostname}`,
        tags: ["extracted", "api", url.hostname],
        is_public: false,
      });
      if (!error) stored++;
    }

    return new Response(JSON.stringify({
      success: true,
      stored,
      total_found: snippets.length,
      source: url.hostname,
      status_code: resp.status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
