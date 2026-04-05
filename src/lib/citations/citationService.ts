import { supabase } from "@/integrations/supabase/client";

export interface Citation {
  id: string;
  citation_type: string;
  title: string;
  full_reference: string;
  abnt_reference?: string;
  official_url?: string;
  official_id?: string;
  jurisdiction: string;
  reliability_score: number;
  is_verified: boolean;
  validity_status: string;
  excerpt?: string;
  official_date?: string;
  created_at: string;
}

export interface VerificationResult {
  url_accessible: boolean;
  content_matches: boolean;
  validity_confirmed: boolean;
  reliability_score: number;
  abnt_reference: string;
}

export interface CitationSource {
  id: string;
  name: string;
  jurisdiction: string;
  base_url: string;
  source_type: string;
  reliability_score: number;
}

export interface ExtractResult {
  total_extracted: number;
  results: Array<{
    citation: Citation;
    verification: VerificationResult;
  }>;
}

// Verify a single citation
export async function verifyCitation(citation: {
  type: string;
  title: string;
  full_reference: string;
  official_url?: string;
  official_id?: string;
  jurisdiction?: string;
  excerpt?: string;
  official_date?: string;
  context_document_id?: string;
  context_conversation_id?: string;
}): Promise<{ citation: Citation; verification: VerificationResult }> {
  const { data, error } = await supabase.functions.invoke("citation-verifier", {
    body: { action: "verify_single", citation },
  });
  if (error) throw new Error(error.message);
  return data;
}

// Extract and verify all citations from text
export async function extractAndVerifyCitations(
  text: string,
  contextDocumentId?: string,
  contextConversationId?: string
): Promise<ExtractResult> {
  const { data, error } = await supabase.functions.invoke("citation-verifier", {
    body: {
      action: "extract_and_verify",
      text,
      context_document_id: contextDocumentId,
      context_conversation_id: contextConversationId,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

// Re-verify an existing citation
export async function reverifyCitation(citationId: string): Promise<VerificationResult> {
  const { data, error } = await supabase.functions.invoke("citation-verifier", {
    body: { action: "reverify", citation_id: citationId },
  });
  if (error) throw new Error(error.message);
  return data.verification;
}

// Get official sources
export async function getCitationSources(jurisdiction?: string): Promise<CitationSource[]> {
  const { data, error } = await supabase.functions.invoke("citation-verifier", {
    body: { action: "get_sources", jurisdiction },
  });
  if (error) throw new Error(error.message);
  return data.sources;
}

// Format citation as ABNT
export async function formatCitationAbnt(citation: {
  type: string;
  title: string;
  full_reference: string;
  official_url?: string;
  official_date?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("citation-verifier", {
    body: { action: "format_abnt", citation },
  });
  if (error) throw new Error(error.message);
  return data.abnt_reference;
}

// Get user's citations from DB
export async function getUserCitations(filters?: {
  jurisdiction?: string;
  citation_type?: string;
  is_verified?: boolean;
  limit?: number;
}): Promise<Citation[]> {
  const query: any = supabase
    .from("legal_citations")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.jurisdiction) query.eq("jurisdiction", filters.jurisdiction);
  if (filters?.citation_type) query.eq("citation_type", filters.citation_type);
  if (filters?.is_verified !== undefined) query.eq("is_verified", filters.is_verified);
  if (filters?.limit) query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as Citation[]) || [];
}

// Get citations for a specific document
export async function getDocumentCitations(documentId: string): Promise<Citation[]> {
  const { data, error } = await (supabase
    .from("legal_citations")
    .select("*") as any)
    .eq("context_document_id", documentId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as Citation[]) || [];
}

// Reliability badge helpers
export function getReliabilityLevel(score: number): "high" | "medium" | "low" | "unverified" {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  if (score > 0) return "low";
  return "unverified";
}

export function getReliabilityColor(level: string): string {
  switch (level) {
    case "high": return "text-green-500";
    case "medium": return "text-yellow-500";
    case "low": return "text-orange-500";
    case "unverified": return "text-muted-foreground";
    default: return "text-muted-foreground";
  }
}
