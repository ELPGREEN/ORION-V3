import DeviceIntegrationPanel from "@/components/dashboard/neural/DeviceIntegrationPanel";
import { Radio, Smartphone } from "lucide-react";

export default function DispositivosConfigPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          Dispositivos & IoT
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie conexões Bluetooth, dispositivos IoT e integrações Smart Home
        </p>
      </div>
      <DeviceIntegrationPanel />
    </div>
  );
}
