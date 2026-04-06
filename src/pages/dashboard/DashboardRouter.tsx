import { useUserRole } from "@/hooks/useUserRole";
import DashboardHome from "./DashboardHome";
import ClienteDashboard from "./ClienteDashboard";
import ProdutorDashboard from "./ProdutorDashboard";
import AfiliadoDashboard from "./AfiliadoDashboard";
import NomadeDigitalDashboard from "./NomadeDigitalDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardRouter() {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  switch (role) {
    case "cliente":
      return <ClienteDashboard />;
    case "produtor":
      return <ProdutorDashboard />;
    case "afiliado":
      return <AfiliadoDashboard />;
    case "nomade":
      return <NomadeDigitalDashboard />;
    default:
      return <DashboardHome />;
  }
}
