import { lazy, Suspense } from "react";
import { RobotConnectionProvider } from "@/contexts/RobotConnectionContext";

const RobotControlPanel = lazy(() => import("@/components/dashboard/neural/RobotControlPanel"));

export default function ControleRobotico() {
  return (
    <RobotConnectionProvider>
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
        <RobotControlPanel />
      </Suspense>
    </RobotConnectionProvider>
  );
}
