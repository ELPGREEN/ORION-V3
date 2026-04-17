/**
 * ─── Code Analyzer for Orion Evolution ───
 * Uses AI to analyze and improve code
 */

import { supabase } from "@/integrations/supabase/client";
import { enrichPromptWithFiles } from "./project-file-reader";

export interface CodeAnalysis {
  summary: string;
  issues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    type: string;
    location: string;
    description: string;
    suggestion?: string;
  }>;
  score: number;
}

export interface CodeImprovement {
  summary: string;
  filesCreated: string[];
  filesModified: string[];
  changes: Array<{
    file: string;
    change: string;
    reason: string;
  }>;
}

/**
 * Analyze code with AI
 */
export async function analyzeCodeWithAI(prompt: string): Promise<CodeAnalysis> {
  const enriched = await enrichPromptWithFiles(prompt);
  const { data, error } = await supabase.functions.invoke("neural-ops", {
    body: {
      question: enriched,
      context: "Você é um especialista em análise de código. O conteúdo dos arquivos referenciados já está incluso no prompt — NUNCA peça ao usuário para fornecer o conteúdo de um arquivo. Analise diretamente.",
      intentType: "code_analysis",
    },
  });

  if (error) throw error;

  return {
    summary: data.description || "Análise concluída",
    issues: data.issues || [],
    score: data.score || 70,
  };
}

/**
 * Improve code with AI
 */
export async function improveCodeWithAI(prompt: string): Promise<CodeImprovement> {
  const enriched = await enrichPromptWithFiles(prompt);
  const { data, error } = await supabase.functions.invoke("neural-ops", {
    body: {
      question: enriched,
      context: `Você é o motor de auto-evolução do Sistema Orion.
O conteúdo dos arquivos mencionados já foi carregado e está incluso no prompt.
NUNCA peça ao usuário para colar ou fornecer o conteúdo de qualquer arquivo — você já tem acesso.
Seu papel é analisar, melhorar e evoluir o código automaticamente.

Quando solicitado para "auto evoluir" ou "otimizar":
1. Analise o código mencionado ou contexto
2. Identifique melhorias possíveis
3. Execute as correções quando seguro
4. Retorne resumo das mudanças`,

      intentType: "auto_evolution",
    },
  });

  if (error) throw error;

  return {
    summary: data.description || "Melhorias aplicadas",
    filesCreated: data.filesCreated || [],
    filesModified: data.filesModified || [],
    changes: data.changes || [],
  };
}

/**
 * Generate new code with AI
 */
export async function generateNewCode(prompt: string): Promise<{ description: string; files: string[]; code: Record<string, string> }> {
  const { data, error } = await supabase.functions.invoke("neural-ops", {
    body: {
      question: prompt,
      context: `Você é o генератор de código do Sistema Orion.
Gere código de alta qualidade seguindo as melhores práticas.

Retorne:
- Descrição do que foi gerado
- Lista de arquivos
- Código para cada arquivo em formato JSON {文件名: código}`,
      intentType: "code_generation",
    },
  });

  if (error) throw error;

  return {
    description: data.description || "Código gerado",
    files: data.files || [],
    code: data.code || {},
  };
}

/**
 * Execute bash command (for shell integration)
 */
export async function executeBashCommand(command: string): Promise<{ output: string; exitCode: number }> {
  // This would be handled by a backend function in production
  // For now, we'll simulate it
  return {
    output: `[Simulado] Executando: ${command}`,
    exitCode: 0,
  };
}