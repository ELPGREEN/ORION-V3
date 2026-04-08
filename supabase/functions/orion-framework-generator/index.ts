import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { name, type, description, requirements, tags, user_id } = await req.json();

    if (!name || !type || !description) {
      return new Response(JSON.stringify({ error: "name, type, description are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log start
    await supabase.from("orion_generation_log").insert({
      agent_role: "operation_overseer",
      phase: "pipeline_start",
      action: "INITIATED",
      reasoning: `Starting autonomous generation of "${name}" (${type})`,
      confidence: 1.0,
    });

    // Use AI to generate richer code if available
    let generatedCode = "";
    
    if (geminiKey) {
      const aiPrompt = `Generate a complete TypeScript module for: "${name}"
Type: ${type}
Description: ${description}
Requirements: ${(requirements || []).join(", ")}

Rules:
- Export all public APIs
- Include TypeScript interfaces
- Add JSDoc comments
- No eval(), innerHTML, or document.write
- Return ONLY the TypeScript code, no markdown fences`;

      try {
        const aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: "You are Orion Framework Factory. Generate clean, typed, production-ready TypeScript modules. Output ONLY code." }] },
            contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          generatedCode = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          // Strip markdown fences if present
          generatedCode = generatedCode.replace(/```(?:typescript|ts)?\n?/g, "").replace(/```$/g, "").trim();
        }
      } catch (aiErr) {
        console.error("AI generation failed, using template:", aiErr);
      }
    }

    // Fallback template if AI didn't produce code
    if (!generatedCode || generatedCode.length < 50) {
      generatedCode = generateTemplate(name, type, description, requirements || []);
    }

    // Validate
    const validation = validateCode(generatedCode);
    
    if (!validation.passed) {
      await supabase.from("orion_generation_log").insert({
        agent_role: "risk_guardian",
        phase: "validate",
        action: "BLOCKED",
        reasoning: `Validation failed: ${validation.issues.join("; ")}`,
        confidence: validation.score,
        blocked: true,
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: "Validation failed", 
        issues: validation.issues 
      }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Publish
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    
    const { data: framework, error: insertErr } = await supabase
      .from("orion_frameworks")
      .insert({
        name,
        slug: `${slug}-${Date.now().toString(36)}`,
        version: "1.0.0",
        framework_type: type,
        status: "published",
        description,
        source_code: generatedCode,
        tags: tags || [],
        author_agent: "orion-framework-generator",
        created_by: user_id || null,
        confidence_score: validation.score,
        validation_result: validation,
        exports: extractExports(generatedCode),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Log success
    await supabase.from("orion_generation_log").insert({
      framework_id: framework.id,
      agent_role: "presentation",
      phase: "publish",
      action: "COMPLETED",
      reasoning: `Published "${name}" to marketplace`,
      confidence: 0.95,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      framework: { id: framework.id, name, slug: framework.slug },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Framework generation error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateTemplate(name: string, type: string, desc: string, reqs: string[]): string {
  const className = name.replace(/\s/g, "");
  return `/**
 * ${name}
 * Auto-generated by Orion Framework Factory
 * Type: ${type}
 * ${desc}
 */

export interface ${className}Config {
  enabled: boolean;
  version: string;
  options: Record<string, unknown>;
}

export interface ${className}Result {
  success: boolean;
  data: unknown;
  metadata: { timestamp: number; version: string };
}

export class ${className} {
  private config: ${className}Config;

  constructor(config?: Partial<${className}Config>) {
    this.config = { enabled: true, version: "1.0.0", options: {}, ...config };
  }

  async execute(input: unknown): Promise<${className}Result> {
    if (!this.config.enabled) {
      return { success: false, data: null, metadata: { timestamp: Date.now(), version: this.config.version } };
    }
    return { success: true, data: input, metadata: { timestamp: Date.now(), version: this.config.version } };
  }

  getVersion(): string { return this.config.version; }
}

export const ${className}_META = {
  name: "${name}",
  type: "${type}",
  version: "1.0.0",
  requirements: ${JSON.stringify(reqs)},
  generatedAt: ${Date.now()},
};
`;
}

function validateCode(code: string): { passed: boolean; score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 1.0;

  if (/eval\s*\(/.test(code)) { issues.push("Contains eval()"); score -= 0.5; }
  if (/innerHTML\s*=/.test(code)) { issues.push("Direct innerHTML"); score -= 0.3; }
  if (/document\.write/.test(code)) { issues.push("document.write()"); score -= 0.3; }
  if (!code.includes("export")) { issues.push("No exports"); score -= 0.2; }
  if (code.length < 50) { issues.push("Too short"); score -= 0.3; }

  score = Math.max(0, score);
  return { passed: score >= 0.7 && issues.length === 0, score, issues };
}

function extractExports(code: string): string[] {
  const matches = code.match(/export\s+(?:class|function|const|interface|type|enum)\s+(\w+)/g) || [];
  return matches.map(m => m.replace(/export\s+(?:class|function|const|interface|type|enum)\s+/, ""));
}
