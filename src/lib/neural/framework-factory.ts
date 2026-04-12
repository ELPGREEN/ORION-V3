/**
 * ═══ Orion Framework Factory ═══
 * Autonomous framework/module/component generation pipeline.
 * Detects needs → Architects → Builds → Validates → Publishes
 */

import { supabase } from "@/integrations/supabase/client";
import { logAgentAction } from "./orion-network-registry";

// ─── Types ───

export type FrameworkType = 
  | "ui_component" 
  | "business_logic" 
  | "full_stack" 
  | "utility" 
  | "integration" 
  | "template" 
  | "pipeline";

export type FrameworkStatus = "draft" | "validating" | "published" | "deprecated" | "blocked";

export interface OrionFramework {
  id: string;
  name: string;
  slug: string;
  version: string;
  framework_type: FrameworkType;
  status: FrameworkStatus;
  description: string | null;
  readme_md: string | null;
  source_code: string;
  compiled_code: string | null;
  schema_definition: Record<string, any> | null;
  dependencies: any[];
  exports: string[];
  tags: string[];
  author_agent: string;
  confidence_score: number;
  validation_result: Record<string, any> | null;
  downloads: number;
  rating_avg: number;
  rating_count: number;
  is_core: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrameworkGenerationRequest {
  name: string;
  type: FrameworkType;
  description: string;
  requirements: string[];
  tags?: string[];
  targetExports?: string[];
}

export interface GenerationPhaseResult {
  phase: string;
  success: boolean;
  output: any;
  confidence: number;
  reasoning: string;
  durationMs: number;
}

// ─── Pipeline Phases ───

/**
 * Phase 1: DETECT — Analyze usage patterns and identify gaps
 */
export async function detectPhase(context: {
  recentErrors?: string[];
  repeatedPatterns?: string[];
  userRequest?: string;
}): Promise<GenerationPhaseResult> {
  const start = Date.now();
  
  const needs: string[] = [];
  
  if (context.recentErrors?.length) {
    needs.push(`Error patterns detected: ${context.recentErrors.length} recurring issues`);
  }
  if (context.repeatedPatterns?.length) {
    needs.push(`Repeated code patterns: ${context.repeatedPatterns.join(", ")}`);
  }
  if (context.userRequest) {
    needs.push(`User request: ${context.userRequest}`);
  }

  const result: GenerationPhaseResult = {
    phase: "detect",
    success: needs.length > 0,
    output: { needs, priority: needs.length > 2 ? "high" : "medium" },
    confidence: Math.min(0.95, 0.5 + needs.length * 0.15),
    reasoning: needs.length > 0 
      ? `Identified ${needs.length} needs for framework generation`
      : "No actionable needs detected",
    durationMs: Date.now() - start,
  };

  logAgentAction("analysis", "DETECT_PHASE", result.reasoning, result.confidence);
  return result;
}

/**
 * Phase 2: ARCHITECT — Design the framework structure
 */
export function architectPhase(
  request: FrameworkGenerationRequest
): GenerationPhaseResult {
  const start = Date.now();

  const schema = {
    name: request.name,
    slug: request.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    type: request.type,
    interfaces: request.requirements.map((r, i) => ({
      name: `I${request.name.replace(/\s/g, "")}${i}`,
      purpose: r,
    })),
    exports: request.targetExports || [`use${request.name.replace(/\s/g, "")}`, request.name.replace(/\s/g, "")],
    dependencies: [],
    structure: getStructureForType(request.type),
  };

  const result: GenerationPhaseResult = {
    phase: "architect",
    success: true,
    output: schema,
    confidence: 0.85,
    reasoning: `Designed ${request.type} framework "${request.name}" with ${schema.interfaces.length} interfaces and ${schema.exports.length} exports`,
    durationMs: Date.now() - start,
  };

  logAgentAction("proposal_architect", "ARCHITECT_PHASE", result.reasoning, result.confidence);
  return result;
}

function getStructureForType(type: FrameworkType): Record<string, string> {
  const structures: Record<FrameworkType, Record<string, string>> = {
    ui_component: { index: "Component + types", hook: "Custom React hook", styles: "Tailwind variants" },
    business_logic: { index: "Core logic", types: "TypeScript interfaces", utils: "Helper functions" },
    full_stack: { frontend: "React component", backend: "Edge function", schema: "DB migration", types: "Shared types" },
    utility: { index: "Utility functions", types: "Type definitions" },
    integration: { client: "API client", types: "API types", config: "Configuration" },
    template: { template: "Template definition", renderer: "Render engine", schema: "Template schema" },
    pipeline: { stages: "Pipeline stages", orchestrator: "Stage runner", types: "Stage types" },
  };
  return structures[type];
}

/**
 * Phase 3: BUILD — Generate the actual code
 */
export function buildPhase(
  request: FrameworkGenerationRequest,
  architecture: any
): GenerationPhaseResult {
  const start = Date.now();

  const sourceCode = generateSourceCode(request, architecture);

  const result: GenerationPhaseResult = {
    phase: "build",
    success: sourceCode.length > 50,
    output: { sourceCode, lineCount: sourceCode.split("\n").length },
    confidence: 0.8,
    reasoning: `Generated ${sourceCode.split("\n").length} lines of TypeScript for "${request.name}"`,
    durationMs: Date.now() - start,
  };

  logAgentAction("proposal_architect", "BUILD_PHASE", result.reasoning, result.confidence);
  return result;
}

function generateSourceCode(request: FrameworkGenerationRequest, arch: any): string {
  const slug = arch.slug;
  const className = request.name.replace(/\s/g, "");

  const lines: string[] = [
    `/**`,
    ` * ═══ ${request.name} ═══`,
    ` * Auto-generated by Orion Framework Factory`,
    ` * Type: ${request.type} | Version: 1.0.0`,
    ` * ${request.description}`,
    ` */`,
    ``,
  ];

  // Generate interfaces
  for (const iface of arch.interfaces) {
    lines.push(`export interface ${iface.name} {`);
    lines.push(`  /** ${iface.purpose} */`);
    lines.push(`  id: string;`);
    lines.push(`  data: Record<string, unknown>;`);
    lines.push(`  metadata?: { created: number; version: string };`);
    lines.push(`}`);
    lines.push(``);
  }

  // Generate config type
  lines.push(`export interface ${className}Config {`);
  lines.push(`  enabled: boolean;`);
  lines.push(`  version: string;`);
  lines.push(`  options: Record<string, unknown>;`);
  lines.push(`}`);
  lines.push(``);

  // Generate main class/module
  if (request.type === "ui_component") {
    lines.push(`import { useState, useCallback } from "react";`);
    lines.push(``);
    lines.push(`export function use${className}(config?: Partial<${className}Config>) {`);
    lines.push(`  const [state, setState] = useState<Record<string, unknown>>({});`);
    lines.push(`  const [loading, setLoading] = useState(false);`);
    lines.push(``);
    lines.push(`  const execute = useCallback(async (input: unknown) => {`);
    lines.push(`    setLoading(true);`);
    lines.push(`    try {`);
    lines.push(`      // Auto-generated execution logic`);
    lines.push(`      setState(prev => ({ ...prev, lastInput: input, timestamp: Date.now() }));`);
    lines.push(`      return { success: true, data: input };`);
    lines.push(`    } finally {`);
    lines.push(`      setLoading(false);`);
    lines.push(`    }`);
    lines.push(`  }, []);`);
    lines.push(``);
    lines.push(`  return { state, loading, execute, config: { enabled: true, version: "1.0.0", ...config } };`);
    lines.push(`}`);
  } else {
    lines.push(`export class ${className} {`);
    lines.push(`  private config: ${className}Config;`);
    lines.push(`  private state: Map<string, unknown> = new Map();`);
    lines.push(``);
    lines.push(`  constructor(config?: Partial<${className}Config>) {`);
    lines.push(`    this.config = { enabled: true, version: "1.0.0", options: {}, ...config };`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  async execute(input: unknown): Promise<{ success: boolean; data: unknown }> {`);
    lines.push(`    if (!this.config.enabled) return { success: false, data: null };`);
    lines.push(`    this.state.set("lastExecution", Date.now());`);
    lines.push(`    return { success: true, data: input };`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  getState(): Record<string, unknown> {`);
    lines.push(`    return Object.fromEntries(this.state);`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  destroy(): void {`);
    lines.push(`    this.state.clear();`);
    lines.push(`    this.config.enabled = false;`);
    lines.push(`  }`);
    lines.push(`}`);
  }

  lines.push(``);
  lines.push(`// Module metadata`);
  lines.push(`export const ${className}_META = {`);
  lines.push(`  name: "${request.name}",`);
  lines.push(`  slug: "${slug}",`);
  lines.push(`  type: "${request.type}",`);
  lines.push(`  version: "1.0.0",`);
  lines.push(`  author: "orion-framework-factory",`);
  lines.push(`  tags: ${JSON.stringify(request.tags || [])},`);
  lines.push(`  exports: ${JSON.stringify(arch.exports)},`);
  lines.push(`  generatedAt: ${Date.now()},`);
  lines.push(`};`);

  return lines.join("\n");
}

/**
 * Phase 4: VALIDATE — Check syntax, types, security
 */
export function validatePhase(sourceCode: string): GenerationPhaseResult {
  const start = Date.now();
  const issues: string[] = [];
  let score = 1.0;

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, msg: "Contains eval() — security risk", penalty: 0.5 },
    { pattern: /innerHTML\s*=/, msg: "Direct innerHTML assignment — XSS risk", penalty: 0.3 },
    { pattern: /document\.write/, msg: "document.write() — unsafe", penalty: 0.3 },
    { pattern: /localStorage\.setItem.*password/i, msg: "Storing passwords in localStorage", penalty: 0.5 },
    { pattern: /fetch\s*\(\s*['"`]http:/, msg: "Non-HTTPS fetch — insecure", penalty: 0.2 },
  ];

  for (const { pattern, msg, penalty } of dangerousPatterns) {
    if (pattern.test(sourceCode)) {
      issues.push(msg);
      score -= penalty;
    }
  }

  // Check structural integrity
  if (!sourceCode.includes("export")) {
    issues.push("No exports found");
    score -= 0.2;
  }
  if (sourceCode.length < 50) {
    issues.push("Code too short — likely incomplete");
    score -= 0.3;
  }

  // Check TypeScript quality
  const hasTypes = /interface|type\s|:\s*(string|number|boolean|Record|unknown)/g.test(sourceCode);
  if (!hasTypes) {
    issues.push("Insufficient TypeScript typing");
    score -= 0.1;
  }

  score = Math.max(0, Math.min(1, score));

  const result: GenerationPhaseResult = {
    phase: "validate",
    success: score >= 0.7 && issues.length === 0,
    output: { score, issues, passed: score >= 0.7 },
    confidence: score,
    reasoning: issues.length === 0 
      ? `Validation passed with score ${score.toFixed(2)}`
      : `Validation found ${issues.length} issues: ${issues.join("; ")}`,
    durationMs: Date.now() - start,
  };

  logAgentAction("risk_guardian", result.success ? "VALIDATE_PASSED" : "VALIDATE_BLOCKED", result.reasoning, score, !result.success);
  return result;
}

/**
 * Phase 5: PUBLISH — Register in marketplace
 */
export async function publishPhase(
  request: FrameworkGenerationRequest,
  architecture: any,
  sourceCode: string,
  validationResult: any,
  userId?: string
): Promise<GenerationPhaseResult> {
  const start = Date.now();

  try {
    const { data, error } = await supabase
      .from("orion_frameworks" as any)
      .insert({
        name: request.name,
        slug: architecture.slug,
        version: "1.0.0",
        framework_type: request.type,
        status: "published",
        description: request.description,
        source_code: sourceCode,
        schema_definition: architecture,
        exports: architecture.exports,
        tags: request.tags || [],
        author_agent: "orion-framework-factory",
        created_by: userId || null,
        confidence_score: validationResult.score,
        validation_result: validationResult,
      } as any)
      .select()
      .single();

    if (error) throw error;

    const result: GenerationPhaseResult = {
      phase: "publish",
      success: true,
      output: { frameworkId: (data as any)?.id, slug: architecture.slug },
      confidence: 0.95,
      reasoning: `Published "${request.name}" to marketplace as ${architecture.slug}`,
      durationMs: Date.now() - start,
    };

    logAgentAction("presentation", "PUBLISH_FRAMEWORK", result.reasoning, 0.95);
    return result;
  } catch (err: any) {
    const result: GenerationPhaseResult = {
      phase: "publish",
      success: false,
      output: { error: err.message },
      confidence: 0,
      reasoning: `Failed to publish: ${err.message}`,
      durationMs: Date.now() - start,
    };
    logAgentAction("operation_overseer", "PUBLISH_FAILED", result.reasoning, 0, true);
    return result;
  }
}

// ─── Full Pipeline ───

export async function runFrameworkPipeline(
  request: FrameworkGenerationRequest,
  userId?: string
): Promise<{
  success: boolean;
  phases: GenerationPhaseResult[];
  framework?: any;
}> {
  const phases: GenerationPhaseResult[] = [];

  // 1. Detect
  const detect = await detectPhase({ userRequest: request.description });
  phases.push(detect);

  // 2. Architect
  const arch = architectPhase(request);
  phases.push(arch);
  if (!arch.success) return { success: false, phases };

  // 3. Build
  const build = buildPhase(request, arch.output);
  phases.push(build);
  if (!build.success) return { success: false, phases };

  // 4. Validate
  const validate = validatePhase(build.output.sourceCode);
  phases.push(validate);
  if (!validate.success) return { success: false, phases };

  // 5. Publish
  const publish = await publishPhase(request, arch.output, build.output.sourceCode, validate.output, userId);
  phases.push(publish);

  // Log generation
  await logGeneration(phases, publish.output?.frameworkId);

  return {
    success: publish.success,
    phases,
    framework: publish.output,
  };
}

async function logGeneration(phases: GenerationPhaseResult[], frameworkId?: string): Promise<void> {
  try {
    const logs = phases.map(p => ({
      framework_id: frameworkId || null,
      agent_role: getAgentForPhase(p.phase),
      phase: p.phase,
      action: p.success ? "COMPLETED" : "FAILED",
      reasoning: p.reasoning,
      output_data: p.output,
      confidence: p.confidence,
      duration_ms: p.durationMs,
      blocked: !p.success,
    }));

    await supabase.from("orion_generation_log" as any).insert(logs as any);
  } catch {
    // Silent fail — logging shouldn't break the pipeline
  }
}

function getAgentForPhase(phase: string): string {
  const map: Record<string, string> = {
    detect: "analysis",
    architect: "proposal_architect",
    build: "proposal_architect",
    validate: "risk_guardian",
    publish: "presentation",
  };
  return map[phase] || "operation_overseer";
}

// ─── Marketplace API ───

export async function getMarketplaceFrameworks(filters?: {
  type?: FrameworkType;
  tags?: string[];
  search?: string;
}): Promise<OrionFramework[]> {
  let query = supabase
    .from("orion_frameworks" as any)
    .select("*")
    .eq("status", "published")
    .order("downloads", { ascending: false });

  if (filters?.type) {
    query = query.eq("framework_type", filters.type);
  }
  if (filters?.tags?.length) {
    query = query.overlaps("tags", filters.tags);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data } = await query;
  return (data as any as OrionFramework[]) || [];
}

export async function installFramework(frameworkId: string, userId: string): Promise<boolean> {
  const { data: fw } = await supabase
    .from("orion_frameworks" as any)
    .select("version")
    .eq("id", frameworkId)
    .single();

  if (!fw) return false;

  const { error } = await supabase.from("orion_module_installations" as any).upsert({
    user_id: userId,
    framework_id: frameworkId,
    installed_version: (fw as any).version,
    is_active: true,
  } as any);

  if (!error) {
    // Increment downloads
    await supabase.rpc("increment_framework_downloads" as any, { fw_id: frameworkId });
  }

  return !error;
}

export async function getUserInstallations(userId: string): Promise<any[]> {
  const { data } = await supabase
    .from("orion_module_installations" as any)
    .select("*, orion_frameworks(*)")
    .eq("user_id", userId)
    .eq("is_active", true);

  return (data as any) || [];
}
