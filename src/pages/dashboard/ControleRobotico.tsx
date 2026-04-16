import { lazy, Suspense } from "react";
import { RobotConnectionProvider } from "@/contexts/RobotConnectionContext";
import { ToolGuard } from "@/components/common/ToolGuard";

const RobotControlPanel = lazy(() => import("@/components/dashboard/neural/RobotControlPanel"));

export default function ControleRobotico() {
  return (
    <ToolGuard tool="robotics" toolLabel="Controle Robótico" mode="upgrade">
      <RobotConnectionProvider>
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
          <RobotControlPanel />
        </Suspense>
      </RobotConnectionProvider>
    </ToolGuard>
  );
}
