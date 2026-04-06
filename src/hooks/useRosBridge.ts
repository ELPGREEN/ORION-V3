/**
 * React hook for ROSBridge WebSocket connection.
 * Provides reactive connection state + topic subscriptions.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { getRosBridgeClient, type ConnectionState, type RosBridgeClient } from "@/lib/robotics/rosbridge-client";

interface UseRosBridgeOptions {
  url?: string;
  autoConnect?: boolean;
}

export function useRosBridge(options: UseRosBridgeOptions = {}) {
  const { url, autoConnect = false } = options;
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const clientRef = useRef<RosBridgeClient | null>(null);

  useEffect(() => {
    const client = getRosBridgeClient(url);
    clientRef.current = client;

    const unsub = client.onStateChange(setConnectionState);
    setConnectionState(client.connectionState);

    if (autoConnect) client.connect();

    return () => { unsub(); };
  }, [url, autoConnect]);

  const connect = useCallback(() => clientRef.current?.connect(), []);
  const disconnect = useCallback(() => clientRef.current?.disconnect(), []);

  const subscribe = useCallback(
    (topic: string, type: string, callback: (msg: unknown) => void, throttleRate?: number) => {
      return clientRef.current?.subscribe(topic, type, callback, throttleRate) ?? (() => {});
    }, []
  );

  const publish = useCallback(
    (topic: string, type: string, msg: unknown) => clientRef.current?.publish(topic, type, msg), []
  );

  const callService = useCallback(
    <T = unknown>(service: string, args?: unknown) =>
      clientRef.current?.callService<T>(service, args) ?? Promise.reject("Not connected"), []
  );

  return {
    client: clientRef.current,
    connectionState,
    isConnected: connectionState === "connected",
    connect,
    disconnect,
    subscribe,
    publish,
    callService,
  };
}
