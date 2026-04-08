import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Orion Code Self-Analysis Edge Function
 * Reads source code from the GitHub repo and uses AI to analyze it,
 * find gaps, suggest improvements, and detect patterns.
 */

const GITHUB_API = "https://api.github.com";
const OWNER = "lovable-dev"; // Will be overridden by repo info
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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
    const _gkN4 = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"];
    const GEMINI_KEY = _gkN4.map(n => Deno.env.get(n)).filter(Boolean)[Math.floor(Math.random() * 8)] as string || "";

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
        if (GEMINI_KEY) {
          const analysis = await analyzeWithGemini(GEMINI_KEY, content, path, query || "Analyze this code for bugs, gaps, and improvement opportunities.");
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
          ...flattenTree(edgeFunctions, "supabase/functions")
        ];

        if (GEMINI_KEY) {
          const gapAnalysis = await analyzeWithGemini(
            GEMINI_KEY,
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

        if (GEMINI_KEY) {
          const suggestions = await analyzeWithGemini(
            GEMINI_KEY,
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

// ─── AI Analysis (Direct Gemini — FREE) ───

function getGeminiKeysRotated(primaryKey: string): string[] {
  return [
    primaryKey
  ].filter((k): k is string => !!k);
}

async function analyzeWithGemini(apiKey: string, content: string, filePath: string, query: string): Promise<string> {
  const keys = getGeminiKeysRotated(apiKey);
  for (const key of keys) {
    try {
      const res = await fetch(`${GEMINI_API_BASE}/gemini-2.5-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `Você é o motor de auto-análise do Orion — uma IA neural avançada. Analise o código-fonte fornecido com rigor técnico máximo. Identifique: bugs potenciais, lacunas de segurança, oportunidades de otimização, padrões ausentes, e sugestões de melhoria. Responda em português brasileiro, de forma estruturada com bullet points.` }] },
          contents: [{ role: "user", parts: [{ text: `Arquivo/Contexto: ${filePath}\n\nQuery: ${query}\n\nCódigo:\n${content.substring(0, 12000)}` }] }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da análise AI.";
      }
      await res.text();
    } catch (e) {
      console.error("Gemini analysis error:", e);
    }
  }
  return "Análise AI indisponível — todas as chaves falharam.";
}
