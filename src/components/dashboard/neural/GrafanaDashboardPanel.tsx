/**
 * Grafana Dashboard Panel — Embed Grafana for OEE & telemetry history
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, ExternalLink, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useRobotConnectionContext } from "@/contexts/RobotConnectionContext";

const DASHBOARDS = [
  { id: "oee", name: "OEE & Produção", path: "/d/oee/production-oee" },
  { id: "telemetry", name: "Telemetria Robô", path: "/d/telemetry/robot-telemetry" },
  { id: "defects", name: "Inspeção & Defeitos", path: "/d/defects/tire-defects" },
  { id: "fleet", name: "Visão de Frota", path: "/d/fleet/fleet-overview" },
];

export default function GrafanaDashboardPanel() {
  const { grafanaUrl, serviceStatus } = useRobotConnectionContext();
  const [activeDashboard, setActiveDashboard] = useState(DASHBOARDS[0].id);
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const dashboard = DASHBOARDS.find((d) => d.id === activeDashboard)!;
  const embedUrl = `${grafanaUrl}${dashboard.path}?orgId=1&kiosk&refresh=10s&_t=${refreshKey}`;
  const isOnline = serviceStatus.grafana === "online";

  return (
    <div className="space-y-4">
      <Card className={fullscreen ? "fixed inset-4 z-50" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Grafana — Dashboards
              <Badge variant={isOnline ? "default" : "secondary"} className="text-[10px]">
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={activeDashboard} onValueChange={setActiveDashboard}>
                <SelectTrigger className="w-40 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARDS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRefreshKey((k) => k + 1)}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(grafanaUrl, "_blank")}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFullscreen(!fullscreen)}>
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isOnline ? (
            <iframe
              key={refreshKey}
              src={embedUrl}
              className={`w-full rounded-lg border-0 ${fullscreen ? "h-[calc(100vh-120px)]" : "h-[500px]"}`}
              title={`Grafana - ${dashboard.name}`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Grafana não disponível</p>
              <p className="text-[10px] mt-1 font-mono">
                Deploy: ./deploy.sh --telemetry
              </p>
              <p className="text-[10px] font-mono">{grafanaUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
