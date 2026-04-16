import { Lock, Sparkles, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import type { PlanTier } from "@/lib/orion-tools/tool-distribution";

interface UpgradeCTAProps {
  reason?: "owner_only" | "role_blocked" | "plan_required";
  requiredPlan?: PlanTier;
  toolLabel?: string;
  compact?: boolean;
}

const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Gratuito",
  premium: "Premium",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function UpgradeCTA({ reason, requiredPlan, toolLabel, compact }: UpgradeCTAProps) {
  const isOwnerOnly = reason === "owner_only";
  const isRoleBlocked = reason === "role_blocked";
  const isPlanGate = reason === "plan_required";

  const Icon = isOwnerOnly ? ShieldOff : isPlanGate ? Sparkles : Lock;

  const title = isOwnerOnly
    ? "Recurso restrito"
    : isPlanGate
      ? `Disponível no plano ${PLAN_LABEL[requiredPlan ?? "premium"]}`
      : "Não disponível para seu perfil";

  const description = isOwnerOnly
    ? "Esta ferramenta está reservada à administração."
    : isPlanGate
      ? `Faça upgrade para acessar ${toolLabel ?? "este recurso"}.`
      : `${toolLabel ?? "Este recurso"} não faz parte do seu papel atual.`;

  return (
    <Card
      className={`flex ${compact ? "flex-row items-center gap-3 p-3" : "flex-col items-center gap-3 p-6 text-center"} border-dashed bg-muted/30`}
    >
      <div className={`flex items-center justify-center rounded-full bg-primary/10 ${compact ? "h-9 w-9" : "h-12 w-12"}`}>
        <Icon className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-primary`} />
      </div>
      <div className={compact ? "flex-1" : ""}>
        <h3 className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>{title}</h3>
        <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm mt-1"}`}>{description}</p>
      </div>
      {isPlanGate && (
        <Button size={compact ? "sm" : "default"} asChild>
          <Link to="/pricing">Ver planos</Link>
        </Button>
      )}
    </Card>
  );
}
