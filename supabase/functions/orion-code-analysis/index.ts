import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Orion Code Self-Analysis Edge Function
 * Reads source code from the GitHub repo and uses AI to analyze it,
 * find gaps, suggest improvements, and detect patterns.
 */

const GITHUB_API = "https://api.github.com";
const OWNER = "lovable-dev"; // Will be overridden by repo info
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface AnalysisRequest {
  mode: "scan" | "analyze_file" | "find_gaps" | "suggest_improvements" | "architecture_map";
  path?: string; // specific file or directory
  query?: string; // natural language query about the code
  depth?: number; // directory scan depth (default 2)
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GITHUB_PAT = Deno.env.get("GITHUB_PAT_CHILD") || Deno.env.get("CHILD_GIT_TOKEN");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!GITHUB_PAT) {
      return new Response(JSON.stringify({ error: "GitHub PAT not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AnalysisRequest = await req.json();
    const { mode, path, query, depth = 2 } = body;

    const ghHeaders = {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Orion-Neural-Engine",
    };

    // Discover repo from the PAT (get repos the token has access to)
    let repoFullName = "";
    try {
      const reposRes = await fetch(`${GITHUB_API}/user/repos?per_page=5&sort=updated&affiliation=owner,collaborator`, {
        headers: ghHeaders,
      });
      if (reposRes.ok) {
        const repos = await reposRes.json();
        // Find the Orion/ELP project repo
        const target = repos.find((r: any) =>
          r.name.toLowerCase().includes("orion") ||
          r.name.toLowerCase().includes("elp") ||
          r.full_name.includes("orionelp")
        ) || repos[0];
        if (target) repoFullName = target.full_name;
      }
    } catch { /* fallback below */ }

    if (!repoFullName) {
      return new Response(JSON.stringify({
        error: "Could not discover repository. Check GITHUB_PAT_CHILD permissions.",
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: any;

    switch (mode) {
      case "scan": {
        // List directory tree
        const targetPath = path || "src/lib/neural";
        const tree = await fetchDirectoryTree(repoFullName, targetPath, depth, ghHeaders);
        result = {
          mode: "scan",
          path: targetPath,
          tree,
          fileCount: countFiles(tree),
          summary: `Scanned ${targetPath}: ${countFiles(tree)} files found`,
        };
        break;
      }

      case "analyze_file": {
        if (!path) {
          return new Response(JSON.stringify({ error: "path is required for analyze_file" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const content = await fetchFileContent(repoFullName, path, ghHeaders);
        if (!content) {
          return new Response(JSON.stringify({ error: `File not found: ${path}` }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Use AI to analyze the file
        if (LOVABLE_API_KEY) {
          const analysis = await analyzeWithAI(LOVABLE_API_KEY, content, path, query || "Analyze this code for bugs, gaps, and improvement opportunities.");
          result = { mode: "analyze_file", path, analysis, linesOfCode: content.split("\n").length };
        } else {
          // Basic static analysis
          result = {
            mode: "analyze_file",
            path,
            linesOfCode: content.split("\n").length,
            exports: extractExports(content),
            imports: extractImports(content),
            todoComments: extractTodos(content),
            complexity: estimateComplexity(content),
          };
        }
        break;
      }

      case "find_gaps": {
        // Scan key directories and use AI to find gaps
        const neuralFiles = await fetchDirectoryTree(repoFullName, "src/lib/neural", 1, ghHeaders);
        const componentFiles = await fetchDirectoryTree(repoFullName, "src/components/dashboard/neural", 1, ghHeaders);
        const edgeFunctions = await fetchDirectoryTree(repoFullName, "supabase/functions", 1, ghHeaders);

        const fileList = [
          ...flattenTree(neuralFiles, "src/lib/neural"),
          ...flattenTree(componentFiles, "src/components/dashboard/neural"),
          ...flattenTree(edgeFunctions, "supabase/functions"),
        ];

        if (LOVABLE_API_KEY) {
          const gapAnalysis = await analyzeWithAI(
            LOVABLE_API_KEY,
            JSON.stringify(fileList, null, 2),
            "project-structure",
            query || "Based on this file structure, identify missing modules, disconnected components, dead code paths, and architectural gaps. Focus on: 1) Files that exist but aren't imported anywhere, 2) Missing error handling patterns, 3) Incomplete integrations, 4) Security vulnerabilities in the architecture."
          );
          result = { mode: "find_gaps", fileCount: fileList.length, analysis: gapAnalysis };
        } else {
          result = { mode: "find_gaps", fileCount: fileList.length, files: fileList };
        }
        break;
      }

      case "suggest_improvements": {
        const targetPath = path || "src/lib/neural";
        const files = await fetchDirectoryTree(repoFullName, targetPath, 1, ghHeaders);
        const fileNames = flattenTree(files, targetPath);

        // Sample a few files for content analysis
        const sampleFiles: string[] = [];
        for (const f of fileNames.slice(0, 5)) {
          const content = await fetchFileContent(repoFullName, f.path, ghHeaders);
          if (content) sampleFiles.push(`=== ${f.path} ===\n${content.substring(0, 2000)}\n`);
        }

        if (LOVABLE_API_KEY) {
          const suggestions = await analyzeWithAI(
            LOVABLE_API_KEY,
            sampleFiles.join("\n---\n"),
            targetPath,
            query || "Review these code samples and suggest specific improvements: performance optimizations, better error handling, missing TypeScript types, code deduplication, and architectural patterns that should be applied."
          );
          result = { mode: "suggest_improvements", path: targetPath, sampledFiles: fileNames.length, analysis: suggestions };
        } else {
          result = { mode: "suggest_improvements", path: targetPath, files: fileNames };
        }
        break;
      }

      case "architecture_map": {
        const neuralFiles = await fetchDirectoryTree(repoFullName, "src/lib/neural", 1, ghHeaders);
        const fileList = flattenTree(neuralFiles, "src/lib/neural");

        // Read imports from key files to build dependency graph
        const deps: Record<string, string[]> = {};
        for (const f of fileList.slice(0, 20)) {
          const content = await fetchFileContent(repoFullName, f.path, ghHeaders);
          if (content) {
            deps[f.name] = extractImports(content);
          }
        }

        result = {
          mode: "architecture_map",
          totalModules: fileList.length,
          dependencyGraph: deps,
          summary: `Architecture map: ${fileList.length} neural modules, ${Object.keys(deps).length} analyzed for dependencies`,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid mode" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("orion-code-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── GitHub Helpers ───

async function fetchDirectoryTree(repo: string, path: string, depth: number, headers: Record<string, string>): Promise<any[]> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, { headers });
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const result = [];
    for (const item of items) {
      if (item.type === "file") {
        result.push({ name: item.name, type: "file", size: item.size, path: item.path });
      } else if (item.type === "dir" && depth > 0) {
        const children = await fetchDirectoryTree(repo, item.path, depth - 1, headers);
        result.push({ name: item.name, type: "dir", path: item.path, children });
      } else if (item.type === "dir") {
        result.push({ name: item.name, type: "dir", path: item.path });
      }
    }
    return result;
  } catch { return []; }
}

async function fetchFileContent(repo: string, path: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.encoding === "base64" && data.content) {
      return atob(data.content.replace(/\n/g, ""));
    }
    return null;
  } catch { return null; }
}

function countFiles(tree: any[]): number {
  let count = 0;
  for (const item of tree) {
    if (item.type === "file") count++;
    if (item.children) count += countFiles(item.children);
  }
  return count;
}

function flattenTree(tree: any[], basePath: string): Array<{ name: string; path: string; size?: number }> {
  const result: Array<{ name: string; path: string; size?: number }> = [];
  for (const item of tree) {
    if (item.type === "file") result.push({ name: item.name, path: item.path, size: item.size });
    if (item.children) result.push(...flattenTree(item.children, item.path));
  }
  return result;
}

// ─── Static Analysis ───

function extractExports(code: string): string[] {
  const exports: string[] = [];
  const regex = /export\s+(?:default\s+)?(?:function|class|const|let|type|interface|enum)\s+(\w+)/g;
  let m;
  while ((m = regex.exec(code)) !== null) exports.push(m[1]);
  return exports;
}

function extractImports(code: string): string[] {
  const imports: string[] = [];
  const regex = /from\s+["']([^"']+)["']/g;
  let m;
  while ((m = regex.exec(code)) !== null) imports.push(m[1]);
  return imports;
}

function extractTodos(code: string): string[] {
  const todos: string[] = [];
  const regex = /\/\/\s*(TODO|FIXME|HACK|BUG|XXX):?\s*(.*)/gi;
  let m;
  while ((m = regex.exec(code)) !== null) todos.push(`${m[1]}: ${m[2].trim()}`);
  return todos;
}

function estimateComplexity(code: string): { cyclomatic: number; linesOfCode: number; functions: number; classes: number } {
  const lines = code.split("\n");
  const branches = (code.match(/\b(if|else|case|catch|while|for|&&|\|\||\?)\b/g) || []).length;
  const functions = (code.match(/\b(function|=>)\b/g) || []).length;
  const classes = (code.match(/\bclass\s+\w+/g) || []).length;
  return { cyclomatic: branches + 1, linesOfCode: lines.length, functions, classes };
}

// ─── AI Analysis ───

async function analyzeWithAI(apiKey: string, content: string, filePath: string, query: string): Promise<string> {
  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é o motor de auto-análise do Orion — uma IA neural avançada. Analise o código-fonte fornecido com rigor técnico máximo. Identifique: bugs potenciais, lacunas de segurança, oportunidades de otimização, padrões ausentes, e sugestões de melhoria. Responda em português brasileiro, de forma estruturada com bullet points.`,
          },
          {
            role: "user",
            content: `Arquivo/Contexto: ${filePath}\n\nQuery: ${query}\n\nCódigo:\n${content.substring(0, 12000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI analysis failed:", res.status, errText);
      return `Análise AI indisponível (${res.status}). Use modo estático.`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "Sem resposta da análise AI.";
  } catch (e) {
    console.error("AI analysis error:", e);
    return "Erro na análise AI.";
  }
}
