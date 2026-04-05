import { lazy } from "react";
const RobotControlPanel = lazy(() => import("@/components/dashboard/neural/RobotControlPanel"));

export default function ControleRobotico() {
  return <RobotControlPanel />;
}
