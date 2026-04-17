/**
 * LLMProvider interface stub.
 */

export interface LLMProvider {
  name?: string;
  generate(prompt: string, options?: Record<string, unknown>): Promise<string>;
}
