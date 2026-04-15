/**
 * ═══ Orion Rules System ═══
 * Similar to OpenCode rules for agent behavior
 */

export interface Rule {
  id: string;
  name: string;
  description: string;
  pattern?: string;
  action: "allow" | "deny" | "warn" | "ask";
  severity?: "low" | "medium" | "high" | "critical";
}

// ═══ Security Rules ═══
export const SECURITY_RULES: Rule[] = [
  {
    id: "no-secrets",
    name: "No exposed secrets",
    description: "Prevent committing API keys, tokens, or secrets",
    pattern: "(api_key|apiKey|secret|token|password)\\s*[:=]\\s*['\"]",
    action: "deny",
    severity: "critical",
  },
  {
    id: "no-eval",
    name: "No eval()",
    description: "Prevent using eval() which is a security risk",
    pattern: "eval\\s*\\(",
    action: "deny",
    severity: "high",
  },
  {
    id: "no-inner-html",
    name: "No innerHTML without sanitization",
    description: "Prevent XSS vulnerabilities via innerHTML",
    pattern: "\\.innerHTML\\s*=",
    action: "warn",
    severity: "high",
  },
  {
    id: "no-raw-sql",
    name: "No raw SQL queries",
    description: "Use parameterized queries to prevent SQL injection",
    pattern: "(execute|query)\\s*\\([^)]*\\+",
    action: "warn",
    severity: "high",
  },
];

// ═══ Code Quality Rules ═══
export const QUALITY_RULES: Rule[] = [
  {
    id: "no-console-log",
    name: "No console.log in production",
    description: "Use proper logging for production code",
    pattern: "console\\.log\\s*\\(",
    action: "warn",
    severity: "low",
  },
  {
    id: "no-any-type",
    name: "No 'any' type",
    description: "Use proper TypeScript types instead of 'any'",
    pattern: ":\\s*any\\b",
    action: "warn",
    severity: "medium",
  },
  {
    id: "use-async-await",
    name: "Prefer async/await",
    description: "Use async/await instead of .then() chains",
    pattern: "\\.then\\([^)]*=>[^)]*\\.then\\(",
    action: "warn",
    severity: "low",
  },
  {
    id: "component-naming",
    name: "Component naming",
    description: "React components must use PascalCase",
    pattern: "const\\s+[a-z][a-zA-Z0-9]*\\s*=\\s*\\(",
    action: "ask",
    severity: "medium",
  },
];

// ═══ Git Rules ═══
export const GIT_RULES: Rule[] = [
  {
    id: "commit-message-format",
    name: "Commit message format",
    description: "Commit messages must follow conventional commits",
    pattern: "^(feat|fix|docs|style|refactor|test|chore|ci|perf|build):\\s+",
    action: "warn",
    severity: "low",
  },
  {
    id: "no-commit-to-main",
    name: "No direct commits to main",
    description: "Use pull requests instead of direct main commits",
    pattern: "main",
    action: "ask",
    severity: "medium",
  },
];

// ═══ All Rules ═══
export const ALL_RULES = [...SECURITY_RULES, ...QUALITY_RULES, ...GIT_RULES];

// ═══ Rule Checker ═══
export function checkRule(code: string, rule: Rule): boolean {
  if (!rule.pattern) return false;
  const regex = new RegExp(rule.pattern, "i");
  return regex.test(code);
}

export function checkRules(
  code: string,
  ruleSet: Rule[] = ALL_RULES
): Array<{ rule: Rule; matched: boolean }> {
  return ruleSet.map(rule => ({
    rule,
    matched: checkRule(code, rule),
  }));
}

export function getViolations(code: string): Rule[] {
  const results = checkRules(code);
  return results.filter(r => r.matched).map(r => r.rule);
}