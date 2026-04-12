import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { isOwnerEmail } from "@/lib/neural/orion-consciousness";

const PREMIUM_PLANS = ["professional", "business", "enterprise"];
const FREE_TRIAL_TOKENS = 1000;

export function useUserPlan() {
  const { user } = useAuth();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["user-plan-gate", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_plans")
        .select("plan_type, ai_tokens_remaining, stripe_subscription_id, expires_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isOwner = isOwnerEmail(user?.email);

  // Premium = owner OR has a confirmed Stripe subscription with a premium plan
  const hasConfirmedSubscription = !!plan?.stripe_subscription_id && PREMIUM_PLANS.includes(plan?.plan_type ?? "");
  const isExpired = plan?.expires_at ? new Date(plan.expires_at) < new Date() : false;
  const isPremium = !!user && (isOwner || (hasConfirmedSubscription && !isExpired));

  // Tokens: premium users get plan tokens, free users get trial tokens
  const tokensRemaining = plan?.ai_tokens_remaining ?? FREE_TRIAL_TOKENS;

  // Orion access: premium (confirmed payment) OR free trial tokens > 0
  const hasOrionAccess = isPremium || (!!user && tokensRemaining > 0);

  return {
    isPremium,
    isOwner,
    planType: plan?.plan_type ?? null,
    loading: isLoading,
    tokensRemaining,
    hasOrionAccess,
    hasConfirmedSubscription,
    freeTrialTokens: FREE_TRIAL_TOKENS,
  };
}
