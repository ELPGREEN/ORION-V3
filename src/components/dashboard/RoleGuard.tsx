import { Navigate } from "react-router-dom";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { PageLoader } from "@/components/common/PageLoader";
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
    return <PageLoader />;
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
