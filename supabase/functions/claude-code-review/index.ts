import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 8192): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("ANTROPIC_API_KEY");
  if (!apiKey) throw new Error("No ANTHROPIC_API_KEY configured");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (resp.status === 429) throw new Error("Claude rate limited");
  if (resp.status === 402) throw new Error("Claude credits exhausted");
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Claude ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

const SYSTEM_PROMPT = `You are an elite code reviewer. Analyze code changes with extreme precision.

For each issue found, provide:
1. **Severity**: 🔴 Critical | 🟠 Warning | 🟡 Suggestion | 🟢 Nitpick
2. **File & Line**: Exact location
3. **Issue**: What's wrong
4. **Fix**: Concrete code suggestion

Review categories:
- **Security**: XSS, injection, auth bypass, secrets exposure, CSRF
- **Performance**: N+1 queries, memory leaks, unnecessary re-renders, missing indexes
- **Logic**: Race conditions, off-by-one, null handling, edge cases
- **Architecture**: SOLID violations, tight coupling, missing abstractions
- **TypeScript**: Type safety, any usage, missing generics
- **React**: Hook rules, stale closures, missing deps, prop drilling
- **Testing**: Missing edge case tests, flaky patterns
- **DX**: Naming, documentation, dead code

Output format:
## Summary
Brief overview with overall quality score (1-10)

## Issues Found
Grouped by severity, each with file/line, description, and fix

## Positive Highlights
Good patterns worth keeping

## Suggested Improvements
Non-blocking enhancements

Always respond in the language of the code comments (English or Portuguese).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // This can be called by Jules API or authenticated users
    const authHeader = req.headers.get("Authorization");
    const julesToken = req.headers.get("X-Jules-Token");
    const julesSecret = Deno.env.get("JULES_API_KEY");

    const isJules = julesToken && julesSecret && julesToken === julesSecret;
    const isBearer = authHeader?.startsWith("Bearer ");

    if (!isJules && !isBearer) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { diff, files, pr_title, pr_description, context } = body;

    if (!diff && !files) {
      return new Response(JSON.stringify({ error: "Provide 'diff' or 'files' to review" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userPrompt = "";

    if (pr_title) userPrompt += `## PR: ${pr_title}\n`;
    if (pr_description) userPrompt += `${pr_description}\n\n`;
    if (context) userPrompt += `## Context\n${context}\n\n`;

    if (diff) {
      userPrompt += `## Diff\n\`\`\`diff\n${diff.slice(0, 80000)}\n\`\`\`\n`;
    }

    if (files && Array.isArray(files)) {
      for (const file of files.slice(0, 20)) {
        userPrompt += `\n## File: ${file.path}\n\`\`\`${file.language || ""}\n${file.content?.slice(0, 10000) || ""}\n\`\`\`\n`;
      }
    }

    const review = await callClaude(SYSTEM_PROMPT, userPrompt);

    // Extract severity counts from response
    const criticals = (review.match(/🔴/g) || []).length;
    const warnings = (review.match(/🟠/g) || []).length;
    const suggestions = (review.match(/🟡/g) || []).length;

    return new Response(JSON.stringify({
      review,
      model: "claude-sonnet-4",
      stats: { criticals, warnings, suggestions },
      approved: criticals === 0,
      source: isJules ? "jules" : "user",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[claude-code-review] Error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
