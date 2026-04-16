import {
  MessageSquare,
  Mic,
  Eye,
  Globe,
  Pencil,
  Scale,
  Bot,
  Sparkles,
  CreditCard,
  Brain,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserTools } from "@/hooks/useUserTools";
import type { ToolCategory } from "@/lib/orion-tools/tool-distribution";

const CATEGORY_META: Record<ToolCategory, { label: string; Icon: typeof MessageSquare }> = {
  chat: { label: "Chat", Icon: MessageSquare },
  voice: { label: "Voz", Icon: Mic },
  vision: { label: "Visão", Icon: Eye },
  browser: { label: "Browser", Icon: Globe },
  editor: { label: "Editor", Icon: Pencil },
  legal: { label: "Jurídico", Icon: Scale },
  robotics: { label: "Robótica", Icon: Bot },
  jules: { label: "Jules", Icon: Sparkles },
  stripe: { label: "Pagamentos", Icon: CreditCard },
  memory: { label: "Memória", Icon: Brain },
  analytics: { label: "Analytics", Icon: BarChart3 },
};

interface ActiveToolsBadgeProps {
  className?: string;
  showLabels?: boolean;
}

export function ActiveToolsBadge({ className, showLabels = false }: ActiveToolsBadgeProps) {
  const { categories, role, plan, isOwner, loading } = useUserTools();

  if (loading) {
    return <div className="h-8 w-40 animate-pulse rounded bg-muted/40" />;
  }

  const entries = (Object.entries(categories) as [ToolCategory, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
        <Badge variant="outline" className="gap-1">
          {isOwner ? "👑 Owner" : role ?? "—"} · {plan}
        </Badge>
        {entries.map(([cat, count]) => {
          const meta = CATEGORY_META[cat];
          if (!meta) return null;
          const { Icon, label } = meta;
          return (
            <Tooltip key={cat}>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1.5">
                  <Icon className="h-3 w-3" />
                  {showLabels && <span>{label}</span>}
                  <span className="text-xs opacity-70">{count}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {label} — {count} ferramenta{count > 1 ? "s" : ""} ativa{count > 1 ? "s" : ""}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
