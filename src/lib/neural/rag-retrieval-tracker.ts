/**
 * ═══ RAG Retrieval Tracker ═══
 * Armazena os últimos chunks retrievados para uso na avaliação de consciência
 */

let _lastRetrievedChunks: string[] = [];

export function setRetrievedChunks(chunks: string[]): void {
  _lastRetrievedChunks = chunks.slice(0, 20); // Keep max 20 chunks
}

export function getRetrievedChunks(): string[] {
  return [..._lastRetrievedChunks];
}

export function clearRetrievedChunks(): void {
  _lastRetrievedChunks = [];
}