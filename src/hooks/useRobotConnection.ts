/**
 * useRobotConnection — Hook unificado que conecta o Context com o UnifiedRobotClient
 * Fornece estado reativo do robô + comandos via ROSBridge real ou Demo
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { getUnifiedRobotClient, type UnifiedRobotState, type TransportMode } from "@/lib/robotics/unified-robot-client";

interface UseRobotConnectionOptions {
  rosbridgeUrl?: string;
  autoConnect?: boolean;
  transport?: TransportMode;
}

export function useRobotConnection(options: UseRobotConnectionOptions = {}) {
  const { rosbridgeUrl = "ws://localhost:9090", autoConnect = false, transport = "rosbridge" } = options;
  const clientRef = useRef(getUnifiedRobotClient());
  const [state, setState] = useState<UnifiedRobotState>(clientRef.current.currentState);

  useEffect(() => {
    const unsub = clientRef.current.onStateChange(setState);
    setState(clientRef.current.currentState);
    return unsub;
  }, []);

  useEffect(() => {
    if (autoConnect) {
      clientRef.current.connect(rosbridgeUrl, transport);
    }
  }, [autoConnect, rosbridgeUrl, transport]);

  const connect = useCallback((url?: string, mode?: TransportMode) => {
    clientRef.current.connect(url ?? rosbridgeUrl, mode ?? transport);
  }, [rosbridgeUrl, transport]);

  const disconnect = useCallback(() => {
    clientRef.current.disconnect();
  }, []);

  const sendCmdVel = useCallback((lx: number, az: number) => {
    clientRef.current.sendCmdVel(lx, az);
  }, []);

  const sendNav2Goal = useCallback((x: number, y: number, theta: number) => {
    return clientRef.current.sendNav2Goal(x, y, theta);
  }, []);

  const cancelNavigation = useCallback(() => {
    clientRef.current.cancelNavigation();
  }, []);

  const emergencyStop = useCallback((activate: boolean) => {
    clientRef.current.emergencyStop(activate);
  }, []);

  const callService = useCallback(<T = unknown>(service: string, args?: unknown) => {
    return clientRef.current.callService<T>(service, args);
  }, []);

  const subscribe = useCallback((topic: string, type: string, callback: (msg: unknown) => void, throttleRate?: number) => {
    return clientRef.current.subscribe(topic, type, callback, throttleRate);
  }, []);

  return {
    client: clientRef.current,
    state,
    isConnected: state.connected,
    connectionState: state.connectionState,
    transport: state.transport,
    connect,
    disconnect,
    sendCmdVel,
    sendNav2Goal,
    cancelNavigation,
    emergencyStop,
    callService,
    subscribe,
  };
}
