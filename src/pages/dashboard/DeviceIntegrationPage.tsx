import { SEO } from "@/components/SEO";
import { Construction } from "lucide-react";

export default function DeviceIntegrationPage() {
  return (
    <div className="space-y-6">
      <SEO
        title="Dispositivos IoT — ORION Platform"
        description="Gerencie dispositivos Bluetooth e IoT conectados ao sistema"
      />
      <div>
        <h1 className="text-2xl font-serif text-foreground">Dispositivos IoT</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie conexões Bluetooth e dispositivos IoT via MQTT
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Construction className="h-10 w-10" />
        <p className="text-sm">Módulo em reimplementação</p>
      </div>
    </div>
  );
}
