import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "cliente" | "advogado" | "produtor" | "afiliado" | "nomade";

// In-memory cache to avoid redundant DB queries on every navigation
const roleCache = new Map<string, { role: AppRole; isAdmin: boolean }>();

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setIsAdmin(false);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    // Return cached role immediately if available
    if (roleCache.has(user.id)) {
      const cached = roleCache.get(user.id)!;
      setRole(cached.role);
      setIsAdmin(cached.isAdmin);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    const fetchRole = async () => {
      if (initialLoad) {
        setLoading(true);
      }

      try {
        // Use the has_role RPC for best practice as requested in the mission
        const { data: userIsAdmin, error: adminError } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin' as any
        });

        const { data: userIsAdvogado, error: advogadoError } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'advogado' as any
        });

        // For getting the specific role, we use the get_user_role RPC
        const { data: resolvedRole, error: roleError } = await supabase.rpc('get_user_role', {
          _user_id: user.id
        });

        if (adminError || advogadoError || roleError) {
          console.error("Error fetching user roles via RPC:", { adminError, advogadoError, roleError });
        }

        const finalRole = (resolvedRole as AppRole) || "cliente";
        const finalIsAdmin = !!userIsAdmin;

        roleCache.set(user.id, { role: finalRole, isAdmin: finalIsAdmin });
        setRole(finalRole);
        setIsAdmin(finalIsAdmin);
      } catch (error) {
        console.error("Exception fetching roles:", error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchRole();
  }, [user]);

  const isAdvogado = role === "advogado";
  const isCliente = role === "cliente";
  const isProdutor = role === "produtor";
  const isAfiliado = role === "afiliado";
  const isNomade = role === "nomade";

  return { role, loading, isAdvogado, isCliente, isProdutor, isAfiliado, isNomade, isAdmin };
}
