/**
 * Orion Policy Guard — Security Layer
 * Inspired by NVIDIA Nemo Guardrails and NemoClaw Security Policies.
 *
 * Defines what the agent is allowed to do, which domains are safe,
 * and which actions require explicit operator approval.
 */

export const SECURITY_POLICIES = {
  // Domains that never require approval
  trustedDomains: [
    "iasofthub.com",
    "supabase.co",
    "google.com",
    "github.com",
    "huggingface.co",
    "portal.stf.jus.br",
    "scon.stj.jus.br",
    "lexml.gov.br",
    "cnj.jus.br",
    "planalto.gov.br",
    "camara.leg.br",
    "senado.leg.br"
  ],

  // Domains that are strictly forbidden
  blockedDomains: [
    "malware-database.org",
    "phishing-test.com"
  ],

  // Actions that require explicit user approval
  restrictedActions: [
    "clipboardWrite",
    "downloads",
    "bookmarks",
    "history",
    "sensitiveDataExtraction"
  ],

  // PII Patterns to scrub or warn about
  piiPatterns: {
    cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
    cnpj: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /\(\d{2}\)\s\d{4,5}-\d{4}/g
  }
};

/**
 * Validates an action against the security policies.
 */
export function validateAction(action, domain, data = {}) {
  const domainLower = (domain || "").toLowerCase();

  // 1. Check blocked domains
  if (SECURITY_POLICIES.blockedDomains.some(d => domainLower.includes(d))) {
    return { allowed: false, reason: "Domínio bloqueado por segurança." };
  }

  // 2. Check restricted actions
  if (SECURITY_POLICIES.restrictedActions.includes(action)) {
    const isTrusted = SECURITY_POLICIES.trustedDomains.some(d => domainLower.includes(d));
    if (!isTrusted) {
      return { allowed: false, requiresApproval: true, reason: "Esta ação requer aprovação em domínios não confiáveis." };
    }
  }

  // 3. Scan for PII in data if it's a "data extraction" or "chat" action
  if (data && data.text) {
    for (const [key, pattern] of Object.entries(SECURITY_POLICIES.piiPatterns)) {
      // Use search because it's a global regex or needs to find at least one
      if (data.text.match(pattern)) {
        return { allowed: true, warning: `Dados sensíveis (${key.toUpperCase()}) detectados. Proceder com cautela.` };
      }
    }
  }

  return { allowed: true };
}
