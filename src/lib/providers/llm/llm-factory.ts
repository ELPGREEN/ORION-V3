/**
 * LLMProvider interface stub.
 */

export interface LLMCompletion {
  text: string;
  [key: string]: unknown;
}

export interface LLMProvider {
  name?: string;
  generate(prompt: string, options?: Record<string, unknown>): Promise<string>;
  complete(prompt: string, options?: Record<string, unknown>): Promise<LLMCompletion>;
}
