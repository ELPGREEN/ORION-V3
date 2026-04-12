import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Bot, Battery, Wifi, WifiOff, Radio } from "lucide-react";
import { ros2Bridge, type RobotState } from "@/lib/neural/ros2-protocol-bridge";
import { toast } from "sonner";

interface Props {
  activeRobotId: string;
  onSelectRobot: (id: string) => void;
}

export default function RobotFleetManager({ activeRobotId, onSelectRobot }: Props) {
  const [robots, setRobots] = useState<RobotState[]>(ros2Bridge.connectedRobots);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const unsub = ros2Bridge.onStateChange(() => {
      setRobots([...ros2Bridge.connectedRobots]);
    });
    return unsub;
  }, []);

  const handleAdd = () => {
    const id = newId.trim() || `robot-${Date.now()}`;
    const name = newName.trim() || `Robô ${id}`;
    if (ros2Bridge.getRobot(id)) {
      toast.error("Robô já registrado");
      return;
    }
    ros2Bridge.registerRobot(id, name);
    setRobots([...ros2Bridge.connectedRobots]);
    setNewId("");
    setNewName("");
    setShowAdd(false);
    toast.success(`Robô "${name}" registrado`);
  };

  const batteryColor = (pct: number | undefined) => {
    if (pct === undefined) return "text-muted-foreground";
    if (pct > 0.5) return "text-green-500";
    if (pct > 0.2) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Radio className="h-4 w-4" />
          Frota de Robôs
          <Badge variant="outline" className="text-[10px]">{robots.length}</Badge>
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder="ID do robô (ex: arm-01)"
              value={newId}
              onChange={e => setNewId(e.target.value)}
            />
            <Input
              placeholder="Nome (ex: Braço Robótico #1)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} className="flex-1">Registrar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {robots.map(robot => {
          const isActive = robot.id === activeRobotId;
          const bat = robot.battery?.percentage;
          return (
            <Card
              key={robot.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${isActive ? "border-primary ring-1 ring-primary/30" : ""}`}
              onClick={() => onSelectRobot(robot.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/20" : "bg-muted"}`}>
                      <Bot className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{robot.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{robot.id}</p>
                    </div>
                  </div>
                  {robot.connected ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <Badge variant={robot.connected ? "default" : "secondary"} className="text-[9px]">
                    {robot.operationalMode}
                  </Badge>
                  {bat !== undefined && (
                    <span className={`flex items-center gap-1 ${batteryColor(bat)}`}>
                      <Battery className="h-3 w-3" />
                      {(bat * 100).toFixed(0)}%
                    </span>
                  )}
                  {robot.emergencyStopped && (
                    <Badge variant="destructive" className="text-[9px]">E-STOP</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {robots.length === 0 && (
        <div className="text-center py-8">
          <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum robô registrado</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar Robô
          </Button>
        </div>
      )}
    </div>
  );
}
