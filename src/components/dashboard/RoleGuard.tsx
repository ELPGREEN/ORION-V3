import { Navigate } from "react-router-dom";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Protects dashboard routes by checking the user's role.
 * Admin/Owner always has full bypass access.
 */
export function RoleGuard({ allowedRoles, children, fallbackPath = "/dashboard" }: RoleGuardProps) {
  const { role, loading, isAdmin } = useUserRole();
  const { isOwner } = useAdminAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  // Admin/Owner bypass — full access to all routes
  if (isOwner || isAdmin) {
    return <>{children}</>;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
