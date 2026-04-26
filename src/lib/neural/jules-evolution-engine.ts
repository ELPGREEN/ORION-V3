/**
 * Jules Evolution Engine — Autonomous Self-Improvement Orchestrator
 * ─────────────────────────────────────────────────────────────────
 * 4 domain scanners: Bugs, Performance, Design, Security.
 * Collects runtime signals and dispatches Jules sessions proactively.
 */

import { recordSubsystemFailure, type SubsystemKey } from "./jules-auto-triggers";
import { getImmuneMemory, shouldQuarantine, checkAndRegisterResolutions } from "./jules-immune-system";

// ─── Types ───

export interface ScanResult {
  domain: "bugs" | "performance" | "design" | "security" | "quality" | "industrial";
  issues: ScanIssue[];
  score: number; // 0-100, 100 = healthy
  scannedAt: number;
}

export interface ScanIssue {
  subsystem: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  context?: string;
}

interface ErrorCapture {
  message: string;
  source?: string;
  timestamp: number;
}

// ─── Error Collector ───

const MAX_CAPTURED = 50;
const capturedErrors: ErrorCapture[] = [];
const capturedRejections: ErrorCapture[] = [];
let listenersBound = false;

function bindGlobalListeners(): void {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;

  window.addEventListener("error", (e) => {
    capturedErrors.push({
      message: `${e.message} at ${e.filename}:${e.lineno}`,
      source: e.filename || undefined,
      timestamp: Date.now(),
    });
    if (capturedErrors.length > MAX_CAPTURED) capturedErrors.shift();
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason?.message || e.reason?.toString?.() || "Unknown rejection";
    capturedRejections.push({ message: msg, timestamp: Date.now() });
    if (capturedRejections.length > MAX_CAPTURED) capturedRejections.shift();
  });
}

// ─── Bug Scanner ───

export function scanForBugs(): ScanResult {
  bindGlobalListeners();
  const cutoff = Date.now() - 300_000; // last 5 min
  const recentErrors = capturedErrors.filter((e) => e.timestamp > cutoff);
  const recentRejections = capturedRejections.filter((e) => e.timestamp > cutoff);
  const total = recentErrors.length + recentRejections.length;

  const issues: ScanIssue[] = [];

  if (recentErrors.length > 0) {
    const grouped = groupBySource(recentErrors);
    for (const [source, errors] of Object.entries(grouped)) {
      const severity = errors.length >= 5 ? "critical" : errors.length >= 3 ? "high" : "medium";
      issues.push({
        subsystem: classifyErrorSource(source),
        severity,
        message: `${errors.length} errors from ${source}`,
        context: errors.slice(0, 3).map((e) => e.message).join("\n"),
      });
    }
  }

  if (recentRejections.length >= 3) {
    issues.push({
      subsystem: "core_api",
      severity: recentRejections.length >= 5 ? "high" : "medium",
      message: `${recentRejections.length} unhandled promise rejections`,
      context: recentRejections.slice(0, 3).map((e) => e.message).join("\n"),
    });
  }

  return {
    domain: "bugs",
    issues,
    score: Math.max(0, 100 - total * 10),
    scannedAt: Date.now(),
  };
}

// ─── Performance Scanner ───

export function scanPerformance(): ScanResult {
  const issues: ScanIssue[] = [];
  let score = 100;

  if (typeof window !== "undefined" && window.performance) {
    // Memory check (Chrome only)
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (mem) {
      const usedMB = mem.usedJSHeapSize / (1024 * 1024);
      const limitMB = mem.jsHeapSizeLimit / (1024 * 1024);
      const usage = usedMB / limitMB;
      if (usage > 0.8) {
        issues.push({ subsystem: "perf_memory", severity: "critical", message: `Memory usage at ${(usage * 100).toFixed(0)}% (${usedMB.toFixed(0)}MB)` });
        score -= 30;
      } else if (usage > 0.6) {
        issues.push({ subsystem: "perf_memory", severity: "medium", message: `Memory usage at ${(usage * 100).toFixed(0)}%` });
        score -= 15;
      }
    }

    // DOM node count
    const domNodes = document.querySelectorAll("*").length;
    if (domNodes > 3000) {
      issues.push({ subsystem: "perf_render", severity: domNodes > 5000 ? "high" : "medium", message: `DOM has ${domNodes} nodes (heavy)` });
      score -= 15;
    }

    // Long task observer entries (if any were captured)
    const entries = performance.getEntriesByType("longtask");
    if (entries.length > 3) {
      issues.push({ subsystem: "perf_render", severity: "high", message: `${entries.length} long tasks detected (>50ms)` });
      score -= 20;
    }
  }

  return { domain: "performance", issues, score: Math.max(0, score), scannedAt: Date.now() };
}

// ─── Design Scanner ───

export function scanDesign(): ScanResult {
  const issues: ScanIssue[] = [];
  let score = 100;

  if (typeof document === "undefined") return { domain: "design", issues, score, scannedAt: Date.now() };

  // Missing alt texts
  const imgs = document.querySelectorAll("img:not([alt]), img[alt='']");
  if (imgs.length > 0) {
    issues.push({ subsystem: "design_accessibility", severity: "medium", message: `${imgs.length} images missing alt text` });
    score -= 10;
  }

  // Missing ARIA labels on interactive elements
  const buttons = document.querySelectorAll("button:not([aria-label]):not(:has(*))");
  const emptyButtons = Array.from(buttons).filter((b) => !b.textContent?.trim());
  if (emptyButtons.length > 0) {
    issues.push({ subsystem: "design_accessibility", severity: "medium", message: `${emptyButtons.length} buttons without accessible label` });
    score -= 10;
  }

  // Viewport overflow check
  const body = document.body;
  if (body.scrollWidth > window.innerWidth + 10) {
    issues.push({ subsystem: "design_responsive", severity: "high", message: `Horizontal overflow: body ${body.scrollWidth}px > viewport ${window.innerWidth}px` });
    score -= 20;
  }

  return { domain: "design", issues, score: Math.max(0, score), scannedAt: Date.now() };
}

// ─── Security Scanner ───

export function scanSecurity(): ScanResult {
  const issues: ScanIssue[] = [];
  let score = 100;

  if (typeof window === "undefined") return { domain: "security", issues, score, scannedAt: Date.now() };

  const SAFE_LOCALSTORAGE_KEY_PATTERNS = [
    /^sb-[a-z0-9]+-auth-token$/i,
    /^supabase\./i,
    /^orion_jules_subsystem_fails$/i,
    /^pending_google_account_type$/i,
  ];

  // Check for exposed secrets in localStorage.
  // Ignore known framework-managed/session keys such as Supabase auth tokens.
  try {
    const dangerousKeys = ["api_key", "secret", "token", "password", "private_key"];
    for (let i = 0; i < localStorage.length; i++) {
      const rawKey = localStorage.key(i) || "";
      const key = rawKey.toLowerCase();
      const isKnownSafeKey = SAFE_LOCALSTORAGE_KEY_PATTERNS.some((pattern) => pattern.test(rawKey));
      if (isKnownSafeKey) continue;
      if (dangerousKeys.some((d) => key.includes(d) && !key.includes("supabase"))) {
        issues.push({
          subsystem: "sec_auth_flow",
          severity: "high",
          message: `Potentially sensitive key in localStorage: ${rawKey}`,
          context: "Review client-side storage and move sensitive credentials to runtime secrets/server-side flows.",
        });
        score -= 15;
      }
    }
  } catch (error) {
    issues.push({
      subsystem: "sec_auth_flow",
      severity: "medium",
      message: "Security scan could not inspect browser storage safely",
      context: error instanceof Error ? error.message : String(error),
    });
    score -= 5;
  }

  // Check for inline event handlers
  const inlineHandlers = document.querySelectorAll("[onclick], [onerror], [onload]");
  if (inlineHandlers.length > 0) {
    issues.push({
      subsystem: "sec_xss",
      severity: "medium",
      message: `${inlineHandlers.length} inline event handlers (XSS risk)`,
    });
    score -= 10;
  }

  return { domain: "security", issues, score: Math.max(0, score), scannedAt: Date.now() };
}

// ─── Code Quality Scanner ───

export function scanCodeQuality(): ScanResult {
  const issues: ScanIssue[] = [];
  let score = 100;

  // Since we are running in the browser/client, we can't easily scan the FS here,
  // but we can check for runtime signals of poor code quality (e.g. huge state objects, too many components)

  if (typeof window !== "undefined") {
    // Check for excessive console logging
    // (This is just a proxy for "noisy" code)

    // Check for large global objects that might indicate poor state management
    const windowKeys = Object.keys(window).length;
    if (windowKeys > 500) {
      issues.push({ subsystem: "core_state", severity: "medium", message: `Large global scope detected (${windowKeys} keys)` });
      score -= 10;
    }
  }

  return { domain: "quality", issues, score: Math.max(0, score), scannedAt: Date.now() };
}

// ─── Full Scan Orchestrator ───

let lastScanResults: ScanResult[] = [];
let scanRunning = false;

export async function runFullScan(): Promise<ScanResult[]> {
  if (scanRunning) return lastScanResults;
  scanRunning = true;

  try {
    // 1. Check for resolved sessions and register antibodies
    await checkAndRegisterResolutions();

    // 2. Run all scanners
    const results = [
      scanForBugs(),
      scanPerformance(),
      scanDesign(),
      scanSecurity(),
      scanCodeQuality(),
    ];
    lastScanResults = results;

    // Dispatch issues to Jules auto-triggers if thresholds are met
    for (const result of results) {
      for (const issue of result.issues.filter((i) => i.severity === "critical" || i.severity === "high")) {
        const subsystem = issue.subsystem as SubsystemKey;

        // Check immune memory — skip if already fixed recently
        const immune = getImmuneMemory();
        const fingerprint = hashIssue(issue);
        if (immune.antibodies[fingerprint]) continue;

        // Check quarantine
        if (shouldQuarantine(subsystem)) {
          console.log(`[Evolution] ${subsystem} quarantined, skipping`);
          continue;
        }

        await recordSubsystemFailure(subsystem, issue.message, issue.context);
      }
    }

    return results;
  } finally {
    scanRunning = false;
  }
}

export function getLastScanResults(): ScanResult[] {
  return lastScanResults;
}

export function getHealthScore(): { overall: number; bugs: number; performance: number; design: number; security: number; quality: number } {
  if (lastScanResults.length === 0) {
    return { overall: 100, bugs: 100, performance: 100, design: 100, security: 100, quality: 100 };
  }
  const get = (d: string) => lastScanResults.find((r) => r.domain === d)?.score ?? 100;
  const bugs = get("bugs");
  const performance = get("performance");
  const design = get("design");
  const security = get("security");
  const quality = get("quality");
  return { overall: Math.round((bugs + performance + design + security + quality) / 5), bugs, performance, design, security, quality };
}

// ─── Periodic Auto-Scan ───

let scanInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoScan(intervalMs = 300_000): void {
  if (scanInterval) return;
  console.log("[Evolution] Auto-scan started (every 5min)");
  scanInterval = setInterval(() => {
    runFullScan().catch((e) => console.warn("[Evolution] Scan error:", e));
  }, intervalMs);
  // Run immediately
  runFullScan().catch(() => {});
}

export function stopAutoScan(): void {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
    console.log("[Evolution] Auto-scan stopped");
  }
}

// ─── Helpers ───

function groupBySource(errors: ErrorCapture[]): Record<string, ErrorCapture[]> {
  const map: Record<string, ErrorCapture[]> = {};
  for (const e of errors) {
    const key = e.source || "unknown";
    (map[key] ||= []).push(e);
  }
  return map;
}

function classifyErrorSource(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("router") || s.includes("route")) return "core_routing";
  if (s.includes("auth")) return "core_auth";
  if (s.includes("supabase") || s.includes("api")) return "core_api";
  if (s.includes("tf-") || s.includes("tensorflow") || s.includes("keras")) return "tf_inference";
  if (s.includes("vision") || s.includes("mediapipe") || s.includes("vlm") || s.includes("gemini-v")) return "vision_gemini";
  if (s.includes("tts") || s.includes("speech-synthesis")) return "tts_gemini";
  if (s.includes("stt") || s.includes("speech-recognition") || s.includes("whisper")) return "stt_gcp";
  if (s.includes("mqtt") || s.includes("iot") || s.includes("broker")) return "iot_mqtt";
  if (s.includes("ros2") || s.includes("robot") || s.includes("telemetry")) return "iot_ros2";
  if (s.includes("bluetooth") || s.includes("ble")) return "iot_bluetooth";
  return "core_state";
}

function hashIssue(issue: ScanIssue): string {
  return `${issue.subsystem}:${issue.message.slice(0, 50)}`;
}
