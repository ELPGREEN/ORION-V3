import { Navigate } from "react-router-dom";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Protects dashboard routes by checking the user's role.
 * If the user's role is not in allowedRoles, redirects to fallbackPath.
 */
export function RoleGuard({ allowedRoles, children, fallbackPath = "/dashboard" }: RoleGuardProps) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
