import { useUserRole } from "@/hooks/useUserRole";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import DashboardHome from "./DashboardHome";
import ClienteDashboard from "./ClienteDashboard";
import ProdutorDashboard from "./ProdutorDashboard";
import AfiliadoDashboard from "./AfiliadoDashboard";
import NomadeDigitalDashboard from "./NomadeDigitalDashboard";
import AdvogadoDashboard from "./AdvogadoDashboard";
import ProprietarioDashboard from "./ProprietarioDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardRouter() {
  const { role, loading, isAdmin } = useUserRole();
  const { isOwner } = useAdminAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  // Owner or admin → full access dashboard
  if (isOwner || isAdmin) {
    return <ProprietarioDashboard />;
  }

  switch (role) {
    case "cliente":
      return <ClienteDashboard />;
    case "advogado":
      return <AdvogadoDashboard />;
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
