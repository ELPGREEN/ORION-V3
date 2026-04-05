import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const PREMIUM_PLANS = ["professional", "business", "enterprise"];
const OWNER_EMAIL = "info@elpgreen.com";

export function useUserPlan() {
  const { user } = useAuth();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["user-plan-gate", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_plans")
        .select("plan_type")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isOwner = user?.email === OWNER_EMAIL;
  const isPremium = !!user && (isOwner || PREMIUM_PLANS.includes(plan?.plan_type ?? ""));

  return { isPremium, isOwner, planType: plan?.plan_type ?? null, loading: isLoading };
}
