/**
 * ─── Orion MCP Server ───
 * Model Context Protocol server for Orion AI
 * Exposes tools similar to OpenCode for self-programming
 * 
 * MCP allows AI models to call tools/actions directly
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ═══ Orion Tools Registry ═══
const ORION_TOOLS: MCPTool[] = [
  {
    name: "orion_analyze_code",
    description: "Analisa código e identifica problemas, bugs, e oportunidades de otimização",
    inputSchema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Caminho do arquivo para analisar" },
        scope: { type: "string", description: "Escopo da análise (full, function, imports)" },
      },
      required: ["filePath"],
    },
  },
  {
    name: "orion_auto_evolve",
    description: "Auto-evolui o código: refatora, otimiza e corrige automaticamente",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Alvo da evolução (file, component, system)" },
        focus: { type: "string", description: "Foco (performance, refactor, security, features)" },
      },
    },
  },
  {
    name: "orion_create_file",
    description: "Cria novo arquivo com código gerado por IA",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Caminho do novo arquivo" },
        content: { type: "string", description: "Conteúdo do arquivo" },
        template: { type: "string", description: "Template a usar (react-component, hook, etc)" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "orion_edit_file",
    description: "Edita arquivo existente: adiciona, remove ou modifica código",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Caminho do arquivo" },
        operation: { type: "string", description: "Operação: add, remove, replace" },
        target: { type: "string", description: "Código alvo ou linha" },
        newContent: { type: "string", description: "Novo conteúdo" },
      },
      required: ["path", "operation"],
    },
  },
  {
    name: "orion_search_code",
    description: "Busca código em todos os arquivos do projeto",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termo de busca" },
        regex: { type: "boolean", description: "Usar regex" },
        fileFilter: { type: "string", description: "Filtrar por extensão" },
      },
      required: ["query"],
    },
  },
  {
    name: "orion_git_operations",
    description: "Executa operações git: commit, push, pull, branch",
    inputSchema: {
      type: "object",
      properties: {
        operation: { type: "string", description: "Operação: commit, push, pull, status, branch" },
        message: { type: "string", description: "Mensagem de commit" },
        files: { type: "string", description: "Arquivos específicos" },
      },
      required: ["operation"],
    },
  },
  {
    name: "orion_install_deps",
    description: "Instala dependências npm/yarn/pnpm",
    inputSchema: {
      type: "object",
      properties: {
        packages: { type: "string", description: "Pacotes a instalar" },
        flag: { type: "string", description: "Flags (--save-dev, --global, etc)" },
      },
      required: ["packages"],
    },
  },
  {
    name: "orion_run_tests",
    description: "Executa testes unitários/de integração",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Padrão de testes" },
        coverage: { type: "boolean", description: "Gerar relatório de cobertura" },
        watch: { type: "boolean", description: "Modo watch" },
      },
    },
  },
  {
    name: "orion_build_project",
    description: "Compila e builda o projeto",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target: production, development" },
        analyze: { type: "boolean", description: "Gerar análise de bundle" },
      },
    },
  },
  {
    name: "orion_lint",
    description: "Executa linter e formata código",
    inputSchema: {
      type: "object",
      properties: {
        fix: { type: "boolean", description: "Corrigir automaticamente" },
        files: { type: "string", description: "Arquivos específicos" },
      },
    },
  },
  {
    name: "orion_database",
    description: "Executa operações no banco de dados Supabase",
    inputSchema: {
      type: "object",
      properties: {
        operation: { type: "string", description: "Operação: select, insert, update, delete" },
        table: { type: "string", description: "Nome da tabela" },
        data: { type: "string", description: "Dados JSON" },
        filters: { type: "string", description: "Filtros JSON" },
      },
      required: ["operation", "table"],
    },
  },
  {
    name: "orion_deploy_edge",
    description: "Deploy Edge Functions para Supabase",
    inputSchema: {
      type: "object",
      properties: {
        functionName: { type: "string", description: "Nome da função" },
        projectRef: { type: "string", description: "Project ref do Supabase" },
      },
      required: ["functionName"],
    },
  },
  {
    name: "orion_vision_analyze",
    description: "Analisa imagem/frame de câmera com visão computacional",
    inputSchema: {
      type: "object",
      properties: {
        imageBase64: { type: "string", description: "Imagem em base64" },
        mode: { type: "string", description: "Modo: objects, faces, text, full" },
      },
    },
  },
  {
    name: "orion_voice_command",
    description: "Executa comando de voz via IA",
    inputSchema: {
      type: "object",
      properties: {
        transcript: { type: "string", description: "Transcrição do áudio" },
        context: { type: "string", description: "Contexto adicional" },
      },
      required: ["transcript"],
    },
  },
  {
    name: "orion_research",
    description: "Pesquisa na internet e retorna informações atualizadas",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Consulta de pesquisa" },
        sources: { type: "string", description: "Fontes específicas" },
      },
      required: ["query"],
    },
  },
];

// ═══ MCP Request Handlers ═══

function handleToolsList(): MCPResponse {
  return {
    jsonrpc: "2.0",
    id: 1,
    result: {
      tools: ORION_TOOLS,
    },
  };
}

async function handleToolCall(params: { name: string; arguments?: Record<string, unknown> }, supabaseUrl: string, supabaseKey: string): Promise<MCPResponse> {
  const { name, arguments: args = {} } = params;

  console.log(`[MCP] Calling tool: ${name}`, args);

  try {
    switch (name) {
      case "orion_analyze_code": {
        const { data, error } = await fetch(`${supabaseUrl}/functions/v1/neural-ops`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            question: `Analise o arquivo ${args.filePath} e identifique problemas, bugs e oportunidades de otimização.`,
            context: "Você é um especialista em análise de código. Forneça feedback detalhado.",
            intentType: "code_analysis",
          }),
        }).then(r => r.json());

        return {
          jsonrpc: "2.0",
          id: Date.now(),
          result: { content: [{ type: "text", text: data?.description || "Análise concluída" }] },
        };
      }

      case "orion_auto_evolve": {
        const { data, error } = await fetch(`${supabaseUrl}/functions/v1/neural-ops`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            question: `Auto-evolua o código do projeto Orion. Foco: ${args.focus || "todas as áreas"}. Execute melhorias automáticas.`,
            context: "Você é o moteur de auto-evolução do Sistema Orion. Analise, melhore e evolua o código automaticamente.",
            intentType: "auto_evolution",
          }),
        }).then(r => r.json());

        return {
          jsonrpc: "2.0",
          id: Date.now(),
          result: { content: [{ type: "text", text: data?.description || "Evolução concluída" }] },
        };
      }

      case "orion_research": {
        const { data, error } = await fetch(`${supabaseUrl}/functions/v1/neural-ops`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            question: args.query as string,
            context: "Pesquise informações atualizadas e forneça fontes.",
            intentType: "web_search",
          }),
        }).then(r => r.json());

        return {
          jsonrpc: "2.0",
          id: Date.now(),
          result: { content: [{ type: "text", text: data?.description || "Pesquisa concluída" }] },
        };
      }

      case "orion_vision_analyze": {
        const { data, error } = await fetch(`${supabaseUrl}/functions/v1/neural-ops`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            imageBase64: args.imageBase64,
            question: "Analise esta imagem e descreva tudo o que видите.",
            intentType: "visual",
          }),
        }).then(r => r.json());

        return {
          jsonrpc: "2.0",
          id: Date.now(),
          result: { content: [{ type: "text", text: data?.description || "Análise visual concluída" }] },
        };
      }

      case "orion_database": {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const operation = args.operation as string;
        const table = args.table as string;
        const data = args.data ? JSON.parse(args.data as string) : null;
        const filters = args.filters ? JSON.parse(args.filters as string) : {};

        let result;
        switch (operation) {
          case "select":
            result = await supabase.from(table).select(filters.columns || "*").match(filters).maybeSingle();
            break;
          case "insert":
            result = await supabase.from(table).insert(data).select().single();
            break;
          case "update":
            result = await supabase.from(table).update(data).match(filters).select().single();
            break;
          case "delete":
            result = await supabase.from(table).delete().match(filters);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        return {
          jsonrpc: "2.0",
          id: Date.now(),
          result: { content: [{ type: "text", text: JSON.stringify(result.data || result) }] },
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id: Date.now(),
          error: { code: -32601, message: `Tool not found: ${name}` },
        };
    }
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id: Date.now(),
      error: { code: -32000, message: String(err) },
    };
  }
}

// ═══ Main Handler ═══

serve(async (req) => {
  const { url, method } = req;

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // MCP protocol endpoints
    if (url.includes("/mcp/tools")) {
      // List available tools
      return new Response(JSON.stringify(handleToolsList()), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.includes("/mcp/call")) {
      // Call a specific tool
      const body = await req.json() as MCPRequest;
      
      if (body.method === "tools/call" && body.params) {
        const result = await handleToolCall(
          body.params as { name: string; arguments?: Record<string, unknown> },
          supabaseUrl,
          supabaseKey
        );
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Health check
    if (url.includes("/health")) {
      return new Response(JSON.stringify({ 
        status: "ok", 
        tools: ORION_TOOLS.length,
        version: "1.0.0"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});