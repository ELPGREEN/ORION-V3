import { SEO } from "@/components/SEO";
// [REMOVED] import DeviceIntegrationPanel from "@/components/dashboard/neural/DeviceIntegrationPanel";

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
      <DeviceIntegrationPanel />
    </div>
  );
}
