/**
 * WebSocketClient interface stub.
 */

export interface WebSocketClient {
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(): void;
  connect(url?: string): Promise<void> | void;
  onMessage?: (handler: (data: unknown) => void) => void;
}
