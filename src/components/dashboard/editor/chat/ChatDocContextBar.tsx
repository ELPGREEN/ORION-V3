import { FileText, Scale, User, Briefcase, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DocumentAnalysis {
  wordCount: number;
  paragraphCount: number;
  hasLegalBasis: boolean;
  hasJurisprudence: boolean;
  missingElements: string[];
}

interface CaseContext {
  clientName?: string;
  caseNumber?: string;
  legalArea?: string;
  tribunal?: string;
  parties?: { author?: string; defendant?: string };
}

interface ChatDocContextBarProps {
  docAnalysis: DocumentAnalysis;
  caseContext?: CaseContext;
}

export function ChatDocContextBar({ docAnalysis, caseContext }: ChatDocContextBarProps) {
  const hasCase = caseContext && (caseContext.clientName || caseContext.caseNumber || caseContext.legalArea);

  return (
    <div className="space-y-1">
      {/* Case context bar */}
      {hasCase && (
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground overflow-hidden min-w-0 flex-wrap">
          <Briefcase className="h-3 w-3 shrink-0 text-primary/60" />
          {caseContext.clientName && (
            <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-primary/20 text-primary/80 gap-0.5">
              <User className="h-2 w-2" />{caseContext.clientName}
            </Badge>
          )}
          {caseContext.caseNumber && (
            <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-muted-foreground/30 text-muted-foreground">
              {caseContext.caseNumber}
            </Badge>
          )}
          {caseContext.legalArea && (
            <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-primary/30 text-primary/80">
              <Scale className="h-2 w-2 mr-0.5" />{caseContext.legalArea}
            </Badge>
          )}
          {caseContext.tribunal && (
            <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-accent/30 text-accent-foreground">
              <Building2 className="h-2 w-2 mr-0.5" />{caseContext.tribunal}
            </Badge>
          )}
        </div>
      )}
      {/* Document stats */}
      <div className="flex items-center gap-2 text-[9px] text-muted-foreground overflow-hidden min-w-0 flex-wrap">
        <FileText className="h-3 w-3 shrink-0" />
        <span>{docAnalysis.wordCount} palavras</span>
        <span>•</span>
        <span>{docAnalysis.paragraphCount} parágrafos</span>
        {docAnalysis.hasLegalBasis && (
          <Badge variant="outline" className="text-[7px] h-3 px-0.5 border-primary/30 text-primary">Lei ✓</Badge>
        )}
        {docAnalysis.hasJurisprudence && (
          <Badge variant="outline" className="text-[7px] h-3 px-0.5 border-primary/30 text-primary">Jurisprudência ✓</Badge>
        )}
        {docAnalysis.missingElements.length > 0 && (
          <Badge variant="outline" className="text-[7px] h-3 px-0.5 border-destructive/30 text-destructive">
            {docAnalysis.missingElements.length} lacuna{docAnalysis.missingElements.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    </div>
  );
}
