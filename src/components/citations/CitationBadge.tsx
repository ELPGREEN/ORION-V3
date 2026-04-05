import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ExternalLink } from "lucide-react";
import { Citation, getReliabilityLevel } from "@/lib/citations/citationService";

interface CitationBadgeProps {
  citation: Citation;
  index?: number;
  format?: "inline" | "full" | "compact";
  onClick?: () => void;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  citation,
  index,
  format = "inline",
  onClick,
}) => {
  const level = getReliabilityLevel(citation.reliability_score);

  const icon = {
    high: <ShieldCheck className="h-3 w-3" />,
    medium: <ShieldAlert className="h-3 w-3" />,
    low: <ShieldAlert className="h-3 w-3" />,
    unverified: <ShieldQuestion className="h-3 w-3" />,
  }[level];

  const variant = {
    high: "default" as const,
    medium: "secondary" as const,
    low: "outline" as const,
    unverified: "outline" as const,
  }[level];

  if (format === "inline") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={variant}
              className="cursor-pointer text-xs gap-1 mx-0.5"
              onClick={onClick}
            >
              {icon}
              [{index ?? "?"}]
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm" side="top">
            <div className="space-y-1">
              <p className="font-semibold text-xs">{citation.title}</p>
              <p className="text-xs text-muted-foreground">{citation.full_reference}</p>
              {citation.official_url && (
                <a
                  href={citation.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Fonte oficial
                </a>
              )}
              <div className="flex items-center gap-1 text-xs">
                {icon}
                <span>Confiabilidade: {Math.round(citation.reliability_score * 100)}%</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (format === "compact") {
    return (
      <div
        className="flex items-center gap-2 text-xs p-1 rounded hover:bg-muted cursor-pointer"
        onClick={onClick}
      >
        {icon}
        <span className="truncate flex-1">{citation.title}</span>
        <span className="text-muted-foreground">{Math.round(citation.reliability_score * 100)}%</span>
      </div>
    );
  }

  // Full format
  return (
    <div className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm truncate">{citation.title}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{citation.full_reference}</p>
        </div>
        <Badge variant={variant} className="shrink-0 text-xs">
          {Math.round(citation.reliability_score * 100)}%
        </Badge>
      </div>

      {citation.abnt_reference && (
        <p className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
          {citation.abnt_reference}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs">
        <Badge variant="outline" className="text-xs">
          {citation.jurisdiction}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {citation.citation_type}
        </Badge>
        {citation.official_url && (
          <a
            href={citation.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex items-center gap-1 hover:underline ml-auto"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir fonte
          </a>
        )}
      </div>
    </div>
  );
};
