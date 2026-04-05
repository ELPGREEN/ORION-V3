import React from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ExternalLink } from "lucide-react";
import { Citation, getReliabilityLevel } from "@/lib/citations/citationService";

interface CitationFootnotesProps {
  citations: Citation[];
  format?: "abnt" | "simple";
}

/**
 * ABNT-formatted footnotes for documents
 */
export const CitationFootnotes: React.FC<CitationFootnotesProps> = ({
  citations,
  format = "abnt",
}) => {
  if (!citations.length) return null;

  const icon = (citation: Citation) => {
    const level = getReliabilityLevel(citation.reliability_score);
    switch (level) {
      case "high": return <ShieldCheck className="h-3 w-3 text-primary shrink-0" />;
      case "medium": return <ShieldAlert className="h-3 w-3 text-accent-foreground shrink-0" />;
      case "low": return <ShieldAlert className="h-3 w-3 text-destructive shrink-0" />;
      default: return <ShieldQuestion className="h-3 w-3 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="mt-8 pt-4 border-t border-border">
      <h4 className="text-sm font-semibold mb-3 text-foreground">
        {format === "abnt" ? "REFERÊNCIAS" : "Fontes Citadas"}
      </h4>
      <ol className="space-y-2 list-none pl-0">
        {citations.map((citation, idx) => (
          <li key={citation.id} className="flex items-start gap-2 text-xs leading-relaxed">
            <span className="text-muted-foreground font-mono shrink-0 w-6 text-right">
              [{idx + 1}]
            </span>
            {icon(citation)}
            <div className="flex-1">
              {format === "abnt" && citation.abnt_reference ? (
                <span className="text-foreground">{citation.abnt_reference}</span>
              ) : (
                <span className="text-foreground">{citation.full_reference}</span>
              )}
              {citation.official_url && (
                <a
                  href={citation.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {citation.is_verified && (
                <span className="text-primary ml-1">(verificada)</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};
