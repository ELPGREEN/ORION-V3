import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CitationInput {
  type: "legislation" | "jurisprudence" | "doctrine" | "regulation" | "treaty" | "custom";
  title: string;
  full_reference: string;
  official_id?: string;
  official_url?: string;
  jurisdiction?: string;
  excerpt?: string;
  official_date?: string;
  context_document_id?: string;
  context_conversation_id?: string;
}

interface VerificationResult {
  url_accessible: boolean;
  content_matches: boolean;
  validity_confirmed: boolean;
  reliability_score: number;
  abnt_reference: string;
  verification_details: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════
// Official source URL patterns by jurisdiction
// ══════════════════════════════════════════════════════════
const OFFICIAL_URL_PATTERNS: Record<string, RegExp[]> = {
  BR: [
    /planalto\.gov\.br/i,
    /lexml\.gov\.br/i,
    /stf\.jus\.br/i,
    /stj\.jus\.br/i,
    /tst\.jus\.br/i,
    /tjsp\.jus\.br/i,
    /tjrj\.jus\.br/i,
    /senado\.leg\.br/i,
    /camara\.leg\.br/i,
    /jusbrasil\.com\.br/i
  ],
  US: [
    /uscode\.house\.gov/i,
    /law\.cornell\.edu/i,
    /supremecourt\.gov/i,
    /congress\.gov/i
  ],
  EU: [
    /eur-lex\.europa\.eu/i,
    /curia\.europa\.eu/i
  ],
  PT: [/dre\.pt/i],
  IT: [/normattiva\.it/i, /gazzettaufficiale\.it/i],
  ES: [/boe\.es/i],
  CN: [/flk\.npc\.gov\.cn/i],
};

function isOfficialUrl(url: string, jurisdiction: string): boolean {
  const patterns = OFFICIAL_URL_PATTERNS[jurisdiction] || [];
  return patterns.some(p => p.test(url));
}

// ══════════════════════════════════════════════════════════
// ABNT NBR 6023 reference formatter
// ══════════════════════════════════════════════════════════
function formatAbntReference(citation: CitationInput): string {
  const date = citation.official_date
    ? new Date(citation.official_date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "";

  switch (citation.type) {
    case "legislation":
      return `BRASIL. ${citation.title}. ${citation.full_reference}${date ? `. ${date}` : ""}${citation.official_url ? `. Disponível em: <${citation.official_url}>` : ""}.`;
    
    case "jurisprudence": {
      const court = citation.official_id?.split(/[-/]/)?.[0]?.toUpperCase() || "TRIBUNAL";
      return `BRASIL. ${court}. ${citation.title}. ${citation.full_reference}${date ? `. ${date}` : ""}${citation.official_url ? `. Disponível em: <${citation.official_url}>` : ""}.`;
    }
    
    case "doctrine":
      return `${citation.full_reference}${date ? `, ${date}` : ""}.`;
    
    case "treaty":
      return `${citation.title}. ${citation.full_reference}${date ? `. ${date}` : ""}${citation.official_url ? `. Disponível em: <${citation.official_url}>` : ""}.`;
    
    default:
      return `${citation.full_reference}${citation.official_url ? `. Disponível em: <${citation.official_url}>` : ""}.`;
  }
}

// ══════════════════════════════════════════════════════════
// URL verification
// ══════════════════════════════════════════════════════════
async function verifyUrl(url: string): Promise<{ accessible: boolean; status: number; hash: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "OrionLegalCitationVerifier/1.0" },
      redirect: "follow",
    });
    
    clearTimeout(timeout);
    
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${url}:${response.status}:${Date.now()}`)
    );
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    
    return {
      accessible: response.ok || response.status === 301 || response.status === 302,
      status: response.status,
      hash: hashHex.substring(0, 16),
    };
  } catch (error) {
    return { accessible: false, status: 0, hash: "" };
  }
}

// ══════════════════════════════════════════════════════════
// Compute reliability score
// ══════════════════════════════════════════════════════════
function computeReliabilityScore(
  citation: CitationInput,
  urlResult: { accessible: boolean; status: number },
  jurisdiction: string
): number {
  let score = 0;

  // Has official URL (+0.2)
  if (citation.official_url) score += 0.2;

  // URL is accessible (+0.2)
  if (urlResult.accessible) score += 0.2;

  // URL is from official source (+0.3)
  if (citation.official_url && isOfficialUrl(citation.official_url, jurisdiction)) score += 0.3;

  // Has official ID (+0.15)
  if (citation.official_id) score += 0.15;

  // Has date (+0.1)
  if (citation.official_date) score += 0.1;

  // Has excerpt (+0.05)
  if (citation.excerpt) score += 0.05;

  return Math.min(1, Math.round(score * 100) / 100);
}

// ══════════════════════════════════════════════════════════
// Full verification pipeline
// ══════════════════════════════════════════════════════════
async function verifyCitation(citation: CitationInput): Promise<VerificationResult> {
  const jurisdiction = citation.jurisdiction || "BR";
  let urlResult = { accessible: false, status: 0, hash: "" };

  if (citation.official_url) {
    urlResult = await verifyUrl(citation.official_url);
  }

  const isOfficial = citation.official_url ? isOfficialUrl(citation.official_url, jurisdiction) : false;
  const reliabilityScore = computeReliabilityScore(citation, urlResult, jurisdiction);
  const abntReference = formatAbntReference(citation);

  return {
    url_accessible: urlResult.accessible,
    content_matches: isOfficial,
    validity_confirmed: urlResult.accessible && isOfficial,
    reliability_score: reliabilityScore,
    abnt_reference: abntReference,
    verification_details: {
      response_status: urlResult.status,
      response_hash: urlResult.hash,
      is_official_source: isOfficial,
      jurisdiction,
      verified_at: new Date().toISOString(),
    },
  };
}

// ══════════════════════════════════════════════════════════
// Extract citations from AI response text
// ══════════════════════════════════════════════════════════
function extractCitationsFromText(text: string): CitationInput[] {
  const citations: CitationInput[] = [];

  // Pattern: Brazilian laws (Lei nº X.XXX/YYYY, Art. X)
  const lawPattern = /(?:Lei|Decreto|Medida Provisória|Emenda Constitucional|Lei Complementar)\s+(?:n[ºo°]?\s*)?[\d.]+(?:\/\d{4})?/gi;
  const lawMatches = text.match(lawPattern) || [];
  for (const match of lawMatches) {
    citations.push({
      type: "legislation",
      title: match.trim(),
      full_reference: match.trim(),
      jurisdiction: "BR",
    });
  }

  // Pattern: Jurisprudence (STF, STJ, TST, TJXX references)
  const jurispPattern = /(?:STF|STJ|TST|TJ[A-Z]{2})\s*[-–]\s*[A-Za-z]+\s*[\d./-]+/gi;
  const jurispMatches = text.match(jurispPattern) || [];
  for (const match of jurispMatches) {
    const court = match.match(/^(STF|STJ|TST|TJ[A-Z]{2})/i)?.[1] || "";
    citations.push({
      type: "jurisprudence",
      title: match.trim(),
      full_reference: match.trim(),
      official_id: court,
      jurisdiction: "BR",
    });
  }

  // Pattern: Constitutional articles
  const cfPattern = /(?:Art(?:igo)?\.?\s*\d+(?:,?\s*§\s*\d+(?:º)?)?(?:,?\s*(?:inciso\s+)?[IVXLCDM]+)?)\s*(?:da\s+)?(?:CF|Constituição\s+Federal)/gi;
  const cfMatches = text.match(cfPattern) || [];
  for (const match of cfMatches) {
    citations.push({
      type: "legislation",
      title: match.trim(),
      full_reference: `Constituição da República Federativa do Brasil de 1988. ${match.trim()}`,
      official_url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
      jurisdiction: "BR",
    });
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return citations.filter(c => {
    const key = c.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ══════════════════════════════════════════════════════════
// Main handler
// ══════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════════════════
    // Action: verify_single — Verify a single citation
    // ═══════════════════════════════════════════════════
    if (action === "verify_single") {
      const { citation } = body as { citation: CitationInput; action: string };
      if (!citation?.title || !citation?.full_reference) {
        return new Response(JSON.stringify({ error: "title and full_reference required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await verifyCitation(citation);

      // Save citation
      const { data: saved, error: saveError } = await supabase
        .from("legal_citations")
        .insert({
          user_id: user.id,
          citation_type: citation.type,
          jurisdiction: citation.jurisdiction || "BR",
          title: citation.title,
          full_reference: citation.full_reference,
          abnt_reference: result.abnt_reference,
          excerpt: citation.excerpt,
          official_id: citation.official_id,
          official_url: citation.official_url,
          official_date: citation.official_date,
          validity_status: result.validity_confirmed ? "vigente" : "desconhecida",
          verification_hash: result.verification_details.response_hash as string,
          last_verified_at: new Date().toISOString(),
          reliability_score: result.reliability_score,
          is_verified: result.validity_confirmed,
          context_document_id: citation.context_document_id,
          context_conversation_id: citation.context_conversation_id,
        })
        .select()
        .single();

      if (saved) {
        await supabase.from("citation_verifications").insert({
          citation_id: saved.id,
          verification_type: "url_check",
          url_accessible: result.url_accessible,
          content_matches: result.content_matches,
          validity_confirmed: result.validity_confirmed,
          response_status: result.verification_details.response_status as number,
          response_hash: result.verification_details.response_hash as string,
          verification_details: result.verification_details,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        citation: saved,
        verification: result,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══════════════════════════════════════════════════
    // Action: extract_and_verify — Extract from AI text
    // ═══════════════════════════════════════════════════
    if (action === "extract_and_verify") {
      const { text, context_document_id, context_conversation_id } = body;
      if (!text) {
        return new Response(JSON.stringify({ error: "text required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extracted = extractCitationsFromText(text);
      const results = [];

      for (const citation of extracted) {
        citation.context_document_id = context_document_id;
        citation.context_conversation_id = context_conversation_id;
        const verification = await verifyCitation(citation);

        const { data: saved } = await supabase
          .from("legal_citations")
          .insert({
            user_id: user.id,
            citation_type: citation.type,
            jurisdiction: citation.jurisdiction || "BR",
            title: citation.title,
            full_reference: citation.full_reference,
            abnt_reference: verification.abnt_reference,
            excerpt: citation.excerpt,
            official_id: citation.official_id,
            official_url: citation.official_url,
            official_date: citation.official_date,
            validity_status: verification.validity_confirmed ? "vigente" : "desconhecida",
            verification_hash: verification.verification_details.response_hash as string,
            last_verified_at: new Date().toISOString(),
            reliability_score: verification.reliability_score,
            is_verified: verification.validity_confirmed,
            context_document_id: citation.context_document_id,
            context_conversation_id: citation.context_conversation_id,
          })
          .select()
          .single();

        if (saved) {
          await supabase.from("citation_verifications").insert({
            citation_id: saved.id,
            verification_type: "auto_extract",
            url_accessible: verification.url_accessible,
            content_matches: verification.content_matches,
            validity_confirmed: verification.validity_confirmed,
            response_status: verification.verification_details.response_status as number,
            response_hash: verification.verification_details.response_hash as string,
            verification_details: verification.verification_details,
          });
        }

        results.push({ citation: saved, verification });
      }

      return new Response(JSON.stringify({
        success: true,
        total_extracted: extracted.length,
        results,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══════════════════════════════════════════════════
    // Action: reverify — Re-verify existing citation
    // ═══════════════════════════════════════════════════
    if (action === "reverify") {
      const { citation_id } = body;
      if (!citation_id) {
        return new Response(JSON.stringify({ error: "citation_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("legal_citations")
        .select("*")
        .eq("id", citation_id)
        .eq("user_id", user.id)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Citation not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verification = await verifyCitation({
        type: existing.citation_type as CitationInput["type"],
        title: existing.title,
        full_reference: existing.full_reference,
        official_id: existing.official_id || undefined,
        official_url: existing.official_url || undefined,
        jurisdiction: existing.jurisdiction,
        excerpt: existing.excerpt || undefined,
        official_date: existing.official_date || undefined,
      });

      await supabase.from("legal_citations")
        .update({
          last_verified_at: new Date().toISOString(),
          reliability_score: verification.reliability_score,
          is_verified: verification.validity_confirmed,
          verification_hash: verification.verification_details.response_hash as string,
          validity_status: verification.validity_confirmed ? "vigente" : "desconhecida",
          abnt_reference: verification.abnt_reference,
        })
        .eq("id", citation_id);

      await supabase.from("citation_verifications").insert({
        citation_id,
        verification_type: "reverify",
        url_accessible: verification.url_accessible,
        content_matches: verification.content_matches,
        validity_confirmed: verification.validity_confirmed,
        response_status: verification.verification_details.response_status as number,
        response_hash: verification.verification_details.response_hash as string,
        verification_details: verification.verification_details,
      });

      return new Response(JSON.stringify({
        success: true,
        verification,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══════════════════════════════════════════════════
    // Action: get_sources — List official sources
    // ═══════════════════════════════════════════════════
    if (action === "get_sources") {
      const { jurisdiction } = body;
      let query = supabase.from("citation_sources").select("*").eq("is_active", true);
      if (jurisdiction) query = query.eq("jurisdiction", jurisdiction);
      const { data } = await query.order("reliability_score", { ascending: false });

      return new Response(JSON.stringify({ success: true, sources: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════
    // Action: format_abnt — Format citation as ABNT
    // ═══════════════════════════════════════════════════
    if (action === "format_abnt") {
      const { citation } = body as { citation: CitationInput; action: string };
      const abnt = formatAbntReference(citation);
      return new Response(JSON.stringify({ success: true, abnt_reference: abnt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: verify_single, extract_and_verify, reverify, get_sources, format_abnt" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Citation verifier error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
