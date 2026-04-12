import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  initOrionDefense,
  onThreatDetected,
  destroyDefense,
  type ThreatEvent,
} from "@/lib/neural/orion-defense-system";
import { useToast } from "@/hooks/use-toast";
import { requestPushPermission, sendPushNotification } from "@/lib/push-notifications";
import { initWorkingMemory } from "@/lib/neural/orion-working-memory";
import { startHealthChecks } from "@/lib/neural/system-health";

export function OrionShield() {
  const { toast } = useToast();
  const location = useLocation();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    initOrionDefense();
    initWorkingMemory();
    startHealthChecks();
    requestPushPermission();

    const INTEGRATION_THREAT_TYPES = new Set([
      "script_injection", "csp_monitor", "rate_limit", "burst_detected",
      "storage_tampering", "dom_tampering",
    ]);

    const unsub = onThreatDetected((event: ThreatEvent) => {
      if (event.severity === "probe") return;

      // Never show alerts for integration-related monitoring events
      if (INTEGRATION_THREAT_TYPES.has(event.type)) return;

      if (event.severity === "attempt") {
        toast({
          title: "🛡️ Orion Shield",
          description: "Atividade suspeita detectada e monitorada.",
          variant: "default",
        });
      } else if (event.severity === "attack" || event.severity === "critical") {
        toast({
          title: "⚠️ Orion Shield — Alerta",
          description: `Ameaça ${event.severity} monitorada: ${event.type}`,
          variant: "destructive",
        });

        const vibrate = event.severity === "critical"
          ? [300, 100, 300, 100, 300]
          : [200, 100, 200];

        sendPushNotification(
          `⚠️ Orion Shield — ${event.severity.toUpperCase()}`,
          `Ameaça monitorada: ${event.type}\n${new Date(event.timestamp).toLocaleTimeString()}`,
          { tag: event.type, vibrate, requireInteraction: event.severity === "critical" }
        );
      }
    });

    return () => {
      unsub();
      destroyDefense();
    };
  }, []);

  return null;
}
