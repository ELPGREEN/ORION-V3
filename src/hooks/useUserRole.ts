import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "cliente" | "advogado" | "produtor" | "afiliado" | "nomade";

// In-memory cache to avoid redundant DB queries on every navigation
const roleCache = new Map<string, AppRole>();

/** Call this to force a fresh role fetch on next render (e.g. after role change). */
export function clearRoleCache(userId?: string) {
  if (userId) {
    roleCache.delete(userId);
  } else {
    roleCache.clear();
  }
}

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    // Return cached role immediately if available
    if (roleCache.has(user.id)) {
      setRole(roleCache.get(user.id)!);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    const fetchRole = async () => {
      if (initialLoad) {
        setLoading(true);
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("role", { ascending: true });

      let resolvedRole: AppRole = "cliente";
      if (error) {
      } else if (data && data.length > 0) {
        const hasAdvogado = data.some((r: any) => r.role === "advogado");
        const hasAdmin = data.some((r: any) => r.role === "admin");
        const hasProdutor = data.some((r: any) => r.role === "produtor");
        const hasAfiliado = data.some((r: any) => r.role === "afiliado");
        const hasNomade = data.some((r: any) => r.role === "nomade");

        if (hasAdvogado || hasAdmin) {
          resolvedRole = "advogado";
        } else if (hasNomade) {
          resolvedRole = "nomade";
        } else if (hasProdutor) {
          resolvedRole = "produtor";
        } else if (hasAfiliado) {
          resolvedRole = "afiliado";
        } else {
          resolvedRole = (data[0].role as AppRole) || "cliente";
        }
      }
      roleCache.set(user.id, resolvedRole);
      setRole(resolvedRole);
      setLoading(false);
      setInitialLoad(false);
    };

    fetchRole();
  }, [user]);

  const isAdvogado = role === "advogado";
  const isCliente = role === "cliente";
  const isProdutor = role === "produtor";
  const isAfiliado = role === "afiliado";
  const isNomade = role === "nomade";
  const isAdmin = role === "advogado" && roleCache.get(user?.id ?? "") === "advogado";

  // Check if user has actual admin role in DB (detected during fetch)
  const [hasAdminRole, setHasAdminRole] = useState(false);

  useEffect(() => {
    if (!user) { setHasAdminRole(false); return; }
    // Check admin flag from the role resolution
    const checkAdmin = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setHasAdminRole(!!data);
    };
    checkAdmin();
  }, [user]);

  return { role, loading, isAdvogado, isCliente, isProdutor, isAfiliado, isNomade, isAdmin: hasAdminRole };
}
