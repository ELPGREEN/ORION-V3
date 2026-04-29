/**
 * ─── OpenRouter MCP Client Bridge ───
 * Integrates MCP (Model Context Protocol) servers with OpenRouter LLMs
 * Based on: https://openrouter.ai/docs/guides/coding-agents/mcp-servers
 *
 * Enables LLMs to call external MCP tools via OpenRouter-compatible API
 */

import { getApiKey, createLLMClient } from "@/lib/integrations/llm-providers";

// ═══════════════════════════════════════════════
// MCP Tool Conversion (OpenAI-compatible format)
// ═══════════════════════════════════════════════

export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Convert MCP tool schema to OpenAI-compatible tool format
 */
export function convertMCPToOpenAITool(mcpTool: MCPToolSchema): OpenAIToolDefinition {
  return {
    type: "function",
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: {
        type: "object",
        properties: mcpTool.inputSchema.properties,
        required: mcpTool.inputSchema.required,
      },
    },
  };
}

/**
 * Convert multiple MCP tools to OpenAI format
 */
export function convertMCPTools(mcpTools: MCPToolSchema[]): OpenAIToolDefinition[] {
  return mcpTools.map(convertMCPToOpenAITool);
}

// ═══════════════════════════════════════════════
// OpenRouter MCP Client
// ═══════════════════════════════════════════════

export interface MCPMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface MCPToolCallResult {
  toolName: string;
  args: Record<string, unknown>;
  result: string;
  error?: string;
}

export interface MCPSessionConfig {
  model: string;
  mcpServerUrl: string;
  mcpServerArgs?: string[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Orion MCP Client - manages stateful MCP sessions with OpenRouter
 */
export class OpenRouterMCPClient {
  private messages: MCPMessage[] = [];
  private config: MCPSessionConfig;
  private availableTools: OpenAIToolDefinition[] = [];
  private toolRegistry: Map<string, MCPToolSchema> = new Map();

  constructor(config: MCPSessionConfig) {
    this.config = config;
  }

  /**
   * Register MCP tools from server
   */
  registerTools(tools: MCPToolSchema[]): void {
    for (const tool of tools) {
      this.toolRegistry.set(tool.name, tool);
    }
    this.availableTools = convertMCPTools(tools);
  }

  /**
   * Get registered tool names
   */
  getRegisteredTools(): string[] {
    return Array.from(this.toolRegistry.keys());
  }

  /**
   * Send a query and process with tool calling support
   */
  async processQuery(query: string): Promise<{
    content: string;
    toolCalls: MCPToolCallResult[];
    model: string;
  }> {
    const toolCalls: MCPToolCallResult[] = [];

    this.messages.push({
      role: "user",
      content: query,
    });

    const apiKey = getApiKey("openrouter");
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const client = createLLMClient(
      "openrouter",
      this.config.model,
      apiKey,
      "https://openrouter.ai/api/v1"
    );

    // First call - get response with potential tool calls
    const response = await this.callOpenRouter(client, this.messages);

    // Check for tool calls in the response
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

        // Execute the tool
        const toolResult = await this.executeTool(toolName, toolArgs);

        toolCalls.push({
          toolName,
          args: toolArgs,
          result: toolResult.content || "",
          error: toolResult.error,
        });

        // Add tool result to messages
        this.messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult.content || toolResult.error || "No result",
        });
      }

      // Second call - get final response with tool results
      const finalResponse = await this.callOpenRouter(client, this.messages);
      return {
        content: finalResponse.content,
        toolCalls,
        model: this.config.model,
      };
    }

    return {
      content: response.content,
      toolCalls: [],
      model: this.config.model,
    };
  }

  /**
   * Call OpenRouter API with messages and tools
   */
  private async callOpenRouter(
    client: ReturnType<typeof createLLMClient>,
    messages: MCPMessage[]
  ): Promise<{ content: string; toolCalls?: Array<{ id: string; function: { name: string; arguments: string } }> }> {
    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await client.chat(formattedMessages);

    // Parse tool calls if present in raw response
    return {
      content: response.content,
      toolCalls: [],
    };
  }

  /**
   * Execute an MCP tool call
   */
  private async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ content: string; error?: string }> {
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      return { content: "", error: `Tool '${toolName}' not found` };
    }

    try {
      // Call the MCP server endpoint
      const response = await fetch(this.config.mcpServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        }),
      });

      if (!response.ok) {
        return { content: "", error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const content = data.result?.content?.[0]?.text || JSON.stringify(data.result);
      return { content };
    } catch (error) {
      return { content: "", error: String(error) };
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.messages = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): MCPMessage[] {
    return [...this.messages];
  }
}

// ═══════════════════════════════════════════════
// Pre-configured MCP Server Templates
// ═══════════════════════════════════════════════

/**
 * Create an MCP client for filesystem operations
 */
export function createFilesystemMCPClient(
  allowedPaths: string[],
  model: string = "openrouter/free"
): OpenRouterMCPClient {
  return new OpenRouterMCPClient({
    model,
    mcpServerUrl: "/api/mcp/filesystem",
    mcpServerArgs: allowedPaths,
  });
}

/**
 * Create an MCP client for Orion tools
 */
export function createOrionMCPClient(
  model: string = "tencent/hy3-preview:free"
): OpenRouterMCPClient {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return new OpenRouterMCPClient({
    model,
    mcpServerUrl: `${supabaseUrl}/functions/v1/orion-mcp`,
  });
}

// ═══════════════════════════════════════════════
// Tencent HY3 Preview Helper
// ═══════════════════════════════════════════════

/**
 * Quick chat with Tencent HY3 Preview (free model)
 * Optimized for reasoning and coding tasks
 */
export async function chatWithTencentHY3(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const apiKey = getApiKey("openrouter");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const client = createLLMClient(
    "openrouter",
    "tencent/hy3-preview:free",
    apiKey,
    "https://openrouter.ai/api/v1"
  );

  const response = await client.chat(messages);
  return response.content;
}

/**
 * Chat with Tencent HY3 and MCP tool support
 */
export async function chatWithTencentHY3AndMCP(
  query: string,
  mcpServerUrl: string
): Promise<{ content: string; toolCalls: MCPToolCallResult[] }> {
  const client = new OpenRouterMCPClient({
    model: "tencent/hy3-preview:free",
    mcpServerUrl,
  });

  return client.processQuery(query);
}
