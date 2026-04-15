/**
 * ═══ Orion Plugins Ecosystem ═══
 * Extensible plugin system for Orion AI
 */

export interface OrionPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  dependencies?: string[];
  hooks?: PluginHooks;
  tools?: string[];
  commands?: string[];
}

export interface PluginHooks {
  onInit?: () => Promise<void> | void;
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  onMessage?: (message: unknown) => Promise<unknown> | unknown;
  onToolCall?: (tool: string, args: Record<string, unknown>) => Promise<unknown> | unknown;
  onCommand?: (command: string, args: Record<string, unknown>) => Promise<string | void> | string | void;
  onVisionFrame?: (frame: ImageData) => Promise<unknown> | unknown;
  onVoiceCommand?: (transcript: string) => Promise<string | void> | string | void;
}

export interface PluginContext {
  registerTool: (tool: PluginTool) => void;
  registerCommand: (command: PluginCommand) => void;
  registerHook: (hook: keyof PluginHooks, handler: Function) => void;
  getConfig: (key: string) => unknown;
  setConfig: (key: string, value: unknown) => void;
  log: (level: string, message: string) => void;
}

export interface PluginTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (args: Record<string, unknown>, context: PluginContext) => Promise<unknown>;
}

export interface PluginCommand {
  name: string;
  description: string;
  handler: (args: Record<string, unknown>, context: PluginContext) => Promise<string>;
}

// ═══ Built-in Plugins ═══
export const CORE_PLUGINS: OrionPlugin[] = [
  {
    id: "core-file",
    name: "File Operations",
    version: "1.0.0",
    description: "File read, write, edit, delete operations",
    enabled: true,
    tools: ["file_read", "file_write", "file_edit", "file_delete", "file_search", "glob"],
  },
  {
    id: "core-shell",
    name: "Shell & Execution",
    version: "1.0.0",
    description: "Shell commands and process execution",
    enabled: true,
    tools: ["shell", "bash", "exec"],
  },
  {
    id: "core-git",
    name: "Git Operations",
    version: "1.0.0",
    description: "Git status, commit, push, pull, branch operations",
    enabled: true,
    tools: ["git_status", "git_commit", "git_push", "git_pull", "git_branch"],
  },
  {
    id: "core-build",
    name: "Build & Deploy",
    version: "1.0.0",
    description: "Build, test, lint, typecheck, deploy operations",
    enabled: true,
    tools: ["lint", "format", "test", "build", "typecheck", "deploy", "deploy_edge"],
  },
  {
    id: "core-search",
    name: "Search Operations",
    version: "1.0.0",
    description: "Web and text search capabilities",
    enabled: true,
    tools: ["text_search", "web_search", "web_fetch"],
  },
  {
    id: "core-vision",
    name: "Vision & Analysis",
    version: "1.0.0",
    description: "Computer vision, object detection, OCR",
    enabled: true,
    tools: ["vision_analyze", "detect_objects", "detect_faces", "ocr"],
  },
  {
    id: "core-voice",
    name: "Voice Processing",
    version: "1.0.0",
    description: "Speech to text, text to speech, voice analysis",
    enabled: true,
    tools: ["stt", "tts", "voice_analyze"],
  },
  {
    id: "core-db",
    name: "Database Operations",
    version: "1.0.0",
    description: "Database query and manipulation",
    enabled: true,
    tools: ["db_query", "db_insert", "db_update", "db_delete"],
  },
  {
    id: "core-supabase",
    name: "Supabase Integration",
    version: "1.0.0",
    description: "Supabase functions and storage",
    enabled: true,
    tools: ["supabase_function", "supabase_storage"],
  },
];

// ═══ Plugin Manager ═══
class PluginManager {
  private plugins: Map<string, OrionPlugin> = new Map();
  private tools: Map<string, PluginTool> = new Map();
  private commands: Map<string, PluginCommand> = new Map();
  private hooks: Map<string, Function[]> = new Map();

  async loadPlugin(plugin: OrionPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[Plugins] Plugin ${plugin.id} already loaded`);
      return;
    }

    if (plugin.hooks?.onInit) {
      await plugin.hooks.onInit();
    }

    this.plugins.set(plugin.id, plugin);

    if (plugin.tools) {
      for (const toolName of plugin.tools) {
        console.log(`[Plugins] Tool ${toolName} enabled via ${plugin.id}`);
      }
    }

    if (plugin.hooks?.onLoad) {
      await plugin.hooks.onLoad();
    }

    console.log(`[Plugins] Loaded: ${plugin.name} v${plugin.version}`);
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    if (plugin.hooks?.onUnload) {
      await plugin.hooks.onUnload();
    }

    this.plugins.delete(pluginId);
    console.log(`[Plugins] Unloaded: ${pluginId}`);
  }

  getPlugin(pluginId: string): OrionPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): OrionPlugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): OrionPlugin[] {
    return this.getAllPlugins().filter(p => p.enabled);
  }

  getTool(toolName: string): PluginTool | undefined {
    return this.tools.get(toolName);
  }

  getAllTools(): PluginTool[] {
    return Array.from(this.tools.values());
  }

  registerTool(tool: PluginTool): void {
    this.tools.set(tool.name, tool);
  }

  getCommand(commandName: string): PluginCommand | undefined {
    return this.commands.get(commandName);
  }

  getAllCommands(): PluginCommand[] {
    return Array.from(this.commands.values());
  }

  registerCommand(command: PluginCommand): void {
    this.commands.set(command.name, command);
  }

  async executeHook(hookName: string, ...args: unknown[]): Promise<unknown[]> {
    const handlers = this.hooks.get(hookName) || [];
    const results = await Promise.all(handlers.map(h => h(...args)));
    return results.filter(r => r !== undefined);
  }

  registerHook(hook: string, handler: Function): void {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, []);
    }
    this.hooks.get(hook)!.push(handler);
  }
}

export const pluginManager = new PluginManager();

// ═══ Initialize Core Plugins ═══
export async function initPlugins(): Promise<void> {
  console.log("[Plugins] Initializing core plugins...");
  
  for (const plugin of CORE_PLUGINS) {
    if (plugin.enabled) {
      await pluginManager.loadPlugin(plugin);
    }
  }

  console.log(`[Plugins] Loaded ${pluginManager.getAllPlugins().length} plugins`);
}

// Types are already exported at definition