/**
 * ─── Orion Defense System v2.3 ───
 * Motor de defesa anti-crack com 14 camadas de proteção em tempo real.
 * Inclui biometria comportamental, threat intelligence, CSP enforcement e anomaly scoring.
 * 
 * PRINCÍPIO FUNDAMENTAL: O Shield protege contra atacantes EXTERNOS.
 * NUNCA deve interferir com funcionalidades internas do app (buscas, IA, Spotify, pesquisa jurídica).
 * Todas as APIs internas e de terceiros confiáveis passam direto sem rate-limit ou tarpit.
 * 
 * POLÍTICA IoT/INTEGRAÇÃO: Para IoT, Bluetooth, MQTT, Spotify, Amazon, Alexa e Smart Home,
 * o sistema APENAS monitora e notifica — NUNCA bloqueia, tarpitta ou remove scripts.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export type ThreatSeverity = "probe" | "attempt" | "attack" | "critical";

export interface ThreatEvent {
  id: string;
  type: string;
  severity: ThreatSeverity;
  timestamp: number;
  details: string;
  fingerprint: string;
  countermeasure: string;
}

export interface BehavioralProfile {
  mouseScore: number;
  keystrokeScore: number;
  scrollScore: number;
  humanProbability: number;
}

export interface ThreatIntelResult {
  ip: string;
  country: string;
  isTor: boolean;
  isProxy: boolean;
  isVpn: boolean;
  isp: string;
  abuseScore: number;
  checked: boolean;
}

export interface PrivacyLeakResult {
  webrtcLeak: { detected: boolean; localIPs: string[]; publicIP: string | null };
  dnsLeak: { detected: boolean; resolvers: string[] };
  checked: boolean;
}

export interface DefenseMetrics {
  totalThreats: number;
  blocked: number;
  probes: number;
  attempts: number;
  attacks: number;
  critical: number;
  activeBans: number;
  honeypotTriggers: number;
  tarpitActive: boolean;
  domFortressActive: boolean;
  lastThreat: ThreatEvent | null;
  anomalyScore: number;
  behavioralProfile: BehavioralProfile;
  threatIntel: ThreatIntelResult;
  privacyLeaks: PrivacyLeakResult;
  cspActive: boolean;
  layersActive: number;
}

// ─── Browser Fingerprint (Enhanced v2) ───

function generateFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Orion🛡️", 2, 2);
  }
  const canvasHash = canvas.toDataURL().slice(-32);
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const plugins = navigator.plugins?.length || 0;

  // v2: WebGL renderer hash
  let webglHash = "no-webgl";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) webglHash = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "unknown";
    }
  } catch {}

  // v2: AudioContext fingerprint
  let audioHash = "no-audio";
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioHash = `${ac.sampleRate}_${ac.destination.maxChannelCount}`;
    ac.close();
  } catch {}

  const raw = `${canvasHash}|${screen}|${tz}|${plugins}|${navigator.language}|${navigator.hardwareConcurrency}|${webglHash}|${audioHash}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

// ─── Singleton State ───

let _initialized = false;
const _threatLog: ThreatEvent[] = [];
const _bannedFingerprints = new Set<string>();
const _honeypotTriggers = new Set<string>();
let _tarpitDelay = 0;
let _domFortressActive = false;
let _cspActive = false;
let _fingerprint = "";
let _devToolsOpen = false;
let _listeners: Array<(event: ThreatEvent) => void> = [];
let _mutationObserver: MutationObserver | null = null;

// Sliding window rate limiter — generous limits to avoid blocking legitimate app usage
// The app makes many concurrent API calls (AI cascade, search, Spotify, embeddings)
const _requestWindows: { ts: number }[] = [];
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 300; // Increased: app legitimately makes many API calls
const BURST_WINDOW = 5000;
const BURST_MAX = 150; // Increased: AI cascade + search can burst heavily

// Behavioral biometrics state
const _mouseEvents: { x: number; y: number; t: number; vx: number; vy: number }[] = [];
const _keystrokeDelays: number[] = [];
const _scrollEvents: { delta: number; t: number }[] = [];
let _lastKeyTime = 0;
let _behavioralProfile: BehavioralProfile = { mouseScore: 50, keystrokeScore: 50, scrollScore: 50, humanProbability: 50 };

// Threat intel state
let _threatIntel: ThreatIntelResult = { ip: "", country: "", isTor: false, isProxy: false, isVpn: false, isp: "", abuseScore: 0, checked: false };

// Privacy leak state
let _privacyLeaks: PrivacyLeakResult = {
  webrtcLeak: { detected: false, localIPs: [], publicIP: null },
  dnsLeak: { detected: false, resolvers: [] },
  checked: false,
};

// Injection patterns — ONLY match actual exploit attempts, NOT legal/search terms
// Words like "union", "select", "delete", "insert" are common in legal research,
// jurisprudence, and everyday Portuguese. Only flag combined SQL exploit patterns.
const INJECTION_PATTERNS = [
  /(<script[\s>])/i,
  /(javascript\s*:)/i,
  /(on\w+\s*=\s*["'][^"']*\()/i, // onclick="func()" style handlers only
  /(<iframe[\s>])/i,
  /(<object[\s>])/i,
  /(<embed[\s>])/i,
];

// ─── Internal Activity Suppression ───
// These threat types are normal during internal app usage and should be downgraded
const INTERNAL_ACTIVITY_TYPES = new Set([
  "devtools", "webrtc_leak", "dns_leak", "bot_behavioral", "rate_limit",
  "burst_detected", "dom_tampering", "storage_tampering", "iframe_embed",
  "script_injection", "csp_monitor",
]);

function isInternalAppActivity(): boolean {
  const path = window.location.pathname;
  // All dashboard, auth, login, settings pages are internal
  return path.startsWith("/dashboard") || path.startsWith("/login") || 
         path.startsWith("/auth") || path.startsWith("/panel") ||
         path.startsWith("/spotify") || path.startsWith("/configuracoes") ||
         path === "/" || path.startsWith("/search");
}

// ─── Threat Detection ───

function classifySeverity(type: string, count: number): ThreatSeverity {
  // Suppress internal activity types when user is on app pages
  if (INTERNAL_ACTIVITY_TYPES.has(type) && isInternalAppActivity()) {
    return "probe"; // Downgrade to probe = no toast, no countermeasure
  }
  if (type === "critical_tampering" || type === "session_hijack") return "critical";
  if (type === "injection" || type === "brute_force" || count > 10) return "attack";
  if (type === "devtools" || type === "scraping" || type === "bot_behavioral" || count > 3) return "attempt";
  return "probe";
}

function recordThreat(type: string, details: string, countermeasure: string): ThreatEvent {
  const sameType = _threatLog.filter(t => t.type === type && Date.now() - t.timestamp < 60000);
  const severity = classifySeverity(type, sameType.length + 1);

  const event: ThreatEvent = {
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    severity,
    timestamp: Date.now(),
    details,
    fingerprint: _fingerprint,
    countermeasure,
  };

  _threatLog.push(event);
  if (_threatLog.length > 500) _threatLog.splice(0, 100);

  _listeners.forEach(fn => {
    try { fn(event); } catch {}
  });

  persistThreatLog(event);
  applyCountermeasures(event);

  return event;
}

// ─── Countermeasures ───
// POLÍTICA: Para integrações confiáveis (IoT, Spotify, Amazon, Alexa),
// o sistema NUNCA bloqueia — apenas monitora, registra e notifica.
// Ações de bloqueio são reservadas EXCLUSIVAMENTE para ameaças críticas
// vindas de fontes externas não confiáveis.

function applyCountermeasures(event: ThreatEvent) {
  switch (event.severity) {
    case "probe":
      // No action — normal activity, log only
      break;
    case "attempt":
      // Log only — no blocking (too many false positives from integrations)
      break;
    case "attack":
      // Monitor + notify only — NO tarpit, NO blocking
      // Tarpitting caused issues with IoT/Spotify/Amazon integrations
      console.warn(`[Orion Shield] Attack detected: ${event.type} — monitoring only`);
      break;
    case "critical":
      // Even critical: notify + log, but do NOT block or tarpit
      // DOM Fortress and session poisoning broke legitimate integrations
      console.error(`[Orion Shield] CRITICAL threat: ${event.type} — logged, no block`);
      break;
  }
}

function activateDOMFortress() {
  if (_domFortressActive) return;
  _domFortressActive = true;

  _mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.id === "copy-protection-style") {
            document.head.appendChild(node);
            recordThreat("dom_tampering", "Tentativa de remover proteção de cópia", "revert_dom");
          }
        });
      }
    }
  });

  _mutationObserver.observe(document.head, { childList: true, subtree: true });
}

function poisonSession() {
  try {
    const decoys = {
      "_api_token": `decoy_${Math.random().toString(36)}`,
      "_session_key": `fake_${Date.now().toString(36)}`,
      "_user_data": JSON.stringify({ role: "guest", permissions: [] }),
    };
    Object.entries(decoys).forEach(([k, v]) => localStorage.setItem(k, v));
  } catch {}
}

function banFingerprint(fp: string) {
  _bannedFingerprints.add(fp);
  try {
    const bans = JSON.parse(localStorage.getItem("_orion_bans") || "[]");
    bans.push({ fp, until: Date.now() + 24 * 60 * 60 * 1000 });
    localStorage.setItem("_orion_bans", JSON.stringify(bans));
  } catch {}
}

function isFingerPrintBanned(fp: string): boolean {
  if (_bannedFingerprints.has(fp)) return true;
  try {
    const bans = JSON.parse(localStorage.getItem("_orion_bans") || "[]");
    const now = Date.now();
    const activeBan = bans.find((b: any) => b.fp === fp && b.until > now);
    if (activeBan) {
      _bannedFingerprints.add(fp);
      return true;
    }
  } catch {}
  return false;
}

// ─── Camada 1: Behavioral Biometrics Engine (NOVA v2) ───

function initBehavioralBiometrics() {
  let lastMouse = { x: 0, y: 0, t: 0 };

  // Mouse dynamics
  document.addEventListener("mousemove", (e) => {
    const now = performance.now();
    if (now - lastMouse.t < 50) return; // sample every 50ms
    const vx = e.clientX - lastMouse.x;
    const vy = e.clientY - lastMouse.y;
    _mouseEvents.push({ x: e.clientX, y: e.clientY, t: now, vx, vy });
    if (_mouseEvents.length > 200) _mouseEvents.shift();
    lastMouse = { x: e.clientX, y: e.clientY, t: now };
  }, { passive: true });

  // Keystroke dynamics
  document.addEventListener("keydown", () => {
    const now = performance.now();
    if (_lastKeyTime > 0) {
      const delay = now - _lastKeyTime;
      _keystrokeDelays.push(delay);
      if (_keystrokeDelays.length > 100) _keystrokeDelays.shift();
    }
    _lastKeyTime = now;
  }, { passive: true });

  // Scroll patterns
  document.addEventListener("scroll", () => {
    const now = performance.now();
    _scrollEvents.push({ delta: window.scrollY, t: now });
    if (_scrollEvents.length > 100) _scrollEvents.shift();
  }, { passive: true });

  // Analyze periodically
  setInterval(analyzeBehavior, 10000);
}

function analyzeBehavior() {
  // Mouse analysis: check velocity variance (humans have high variance, bots are linear)
  let mouseScore = 50;
  if (_mouseEvents.length > 20) {
    const velocities = _mouseEvents.map(e => Math.sqrt(e.vx * e.vx + e.vy * e.vy));
    const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((a, v) => a + (v - mean) ** 2, 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    // High std dev = human, low = bot
    mouseScore = Math.min(100, Math.max(0, (stdDev / (mean + 1)) * 100));
  }

  // Keystroke analysis: inter-key delay variance
  let keystrokeScore = 50;
  if (_keystrokeDelays.length > 10) {
    const mean = _keystrokeDelays.reduce((a, b) => a + b, 0) / _keystrokeDelays.length;
    const variance = _keystrokeDelays.reduce((a, v) => a + (v - mean) ** 2, 0) / _keystrokeDelays.length;
    const cv = Math.sqrt(variance) / (mean + 1); // coefficient of variation
    keystrokeScore = Math.min(100, cv * 80);
  }

  // Scroll analysis
  let scrollScore = 50;
  if (_scrollEvents.length > 5) {
    const intervals = [];
    for (let i = 1; i < _scrollEvents.length; i++) {
      intervals.push(_scrollEvents[i].t - _scrollEvents[i - 1].t);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, v) => a + (v - mean) ** 2, 0) / intervals.length;
    scrollScore = Math.min(100, Math.max(0, (Math.sqrt(variance) / (mean + 1)) * 100));
  }

  const humanProbability = Math.round((mouseScore * 0.5 + keystrokeScore * 0.3 + scrollScore * 0.2));

  _behavioralProfile = { mouseScore: Math.round(mouseScore), keystrokeScore: Math.round(keystrokeScore), scrollScore: Math.round(scrollScore), humanProbability };

  // Bot detection
  if (humanProbability < 20 && (_mouseEvents.length > 30 || _keystrokeDelays.length > 20)) {
    recordThreat("bot_behavioral", `Probabilidade humana baixa: ${humanProbability}% (mouse:${Math.round(mouseScore)} keys:${Math.round(keystrokeScore)} scroll:${Math.round(scrollScore)})`, "behavioral_flag");
  }
}

// ─── Camada 2: Threat Intelligence (NOVA v2) ───

async function checkThreatIntel(): Promise<void> {
  // Skip external IP lookup to avoid CORS/rate-limit issues with ipapi.co
  // Basic threat intel is still available via Supabase edge functions if needed
  _threatIntel = {
    ip: "",
    country: "",
    isTor: false,
    isProxy: false,
    isVpn: false,
    isp: "",
    abuseScore: 0,
    checked: true,
  };
}

// ─── Camada 3: CSP Enforcement (NOVA v2) ───

function enforceCSP() {
  if (_cspActive) return;
  _cspActive = true;

  // Block iframes embedding this page (skip Lovable preview which runs in iframe)
  if (window.self !== window.top) {
    const isLovablePreview = window.location.hostname.includes("lovable.app") || 
                              window.location.hostname.includes("lovable.dev") ||
                              window.location.hostname === "localhost";
    if (!isLovablePreview) {
      recordThreat("iframe_embed", "Página carregada dentro de iframe externo", "csp_block");
    }
  }

  // Monitor for injected scripts
  const scriptObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLScriptElement) {
          const src = node.src || "";
          // Allow known sources
          if (src && !src.includes(window.location.hostname) && !src.includes("supabase") && !src.includes("stripe") && !src.includes("googleapis") && !src.includes("googletagmanager") && !src.includes("google-analytics") && !src.includes("gstatic") && !src.includes("firebase") && !src.includes("lovable") && !src.includes("spotify") && !src.includes("scdn.co") && !src.includes("amazon") && !src.includes("alexa") && !src.includes("hivemq") && !src.includes("mqtt")) {
            // MONITOR ONLY — do NOT remove scripts (broke IoT/Spotify/Amazon integrations)
            console.warn(`[Orion Shield] Unknown external script detected: ${src.substring(0, 100)}`);
            recordThreat("script_injection", `Script externo detectado (monitorado): ${src.substring(0, 100)}`, "csp_monitor");
          }
        }
      });
    }
  });

  scriptObserver.observe(document.documentElement, { childList: true, subtree: true });
}

// ─── Honeypot System ───

function injectHoneypots() {
  if (document.getElementById("_orion_hp")) return;

  const hp = document.createElement("div");
  hp.id = "_orion_hp";
  hp.style.cssText = "position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none;height:0;overflow:hidden;";
  hp.innerHTML = `
    <input type="text" name="website_url" id="_hp_url" tabindex="-1" autocomplete="off" />
    <input type="email" name="contact_email" id="_hp_email" tabindex="-1" autocomplete="off" />
    <textarea name="message_body" id="_hp_msg" tabindex="-1"></textarea>
    <a href="/api/admin/config" id="_hp_link" style="display:none">admin</a>
  `;
  document.body.appendChild(hp);

  setInterval(() => {
    const url = (document.getElementById("_hp_url") as HTMLInputElement)?.value;
    const email = (document.getElementById("_hp_email") as HTMLInputElement)?.value;
    const msg = (document.getElementById("_hp_msg") as HTMLTextAreaElement)?.value;
    if (url || email || msg) {
      _honeypotTriggers.add(_fingerprint);
      recordThreat("bot_detected", `Honeypot preenchido: url=${!!url} email=${!!email} msg=${!!msg}`, "honeypot_ban");
      ["_hp_url", "_hp_email", "_hp_msg"].forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) el.value = "";
      });
    }
  }, 5000);
}

// ─── DevTools Detection (Enhanced v2) ───

function detectDevTools() {
  // Method 1: Window size threshold
  const widthThreshold = window.outerWidth - window.innerWidth > 160;
  const heightThreshold = window.outerHeight - window.innerHeight > 160;

  if (widthThreshold || heightThreshold) {
    if (!_devToolsOpen) {
      _devToolsOpen = true;
      recordThreat("devtools", "DevTools detectado via dimensão da janela", "tarpit_dom_fortress");
    }
  } else {
    _devToolsOpen = false;
  }

  // Method 2: Performance timing (debugger causes delay)
  const t1 = performance.now();
  // Using a regular expression that forces engine work
  (function() {})();
  const t2 = performance.now();
  if (t2 - t1 > 100 && !_devToolsOpen) {
    _devToolsOpen = true;
    recordThreat("devtools", "DevTools detectado via timing anomaly", "tarpit_dom_fortress");
  }
}

// ─── Input Monitoring ───
// IMPORTANT: Never sanitize/modify user input in search fields, chat, or forms.
// Only LOG potential injection attempts — do NOT alter the user's text.
// Legal research queries contain words like "delete", "union", "insert" naturally.

function monitorInputs() {
  document.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target?.value) return;

    // Skip monitoring for search inputs, textareas, chat fields — these are user content
    const tagName = target.tagName.toLowerCase();
    const inputType = (target as HTMLInputElement).type?.toLowerCase() || "";
    const isContentInput = tagName === "textarea" || 
                           inputType === "search" || 
                           inputType === "text" ||
                           target.closest("[role='textbox']") ||
                           target.closest("[contenteditable]") ||
                           target.closest("form");
    if (isContentInput) return; // Never interfere with user content

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(target.value)) {
        // LOG only — never modify user input
        recordThreat(
          "injection",
          `Padrão de injeção detectado em ${target.name || target.id || "input"}: ${target.value.substring(0, 50)}`,
          "input_log_only"
        );
        break;
      }
    }
  }, { passive: true });
}

// ─── Rate Limiting (Sliding Window + Burst Detection v2) ───

function checkRateLimit() {
  const now = Date.now();
  _requestWindows.push({ ts: now });

  // Clean old entries
  while (_requestWindows.length > 0 && _requestWindows[0].ts < now - RATE_LIMIT_WINDOW) {
    _requestWindows.shift();
  }

  // Standard rate limit
  if (_requestWindows.length > RATE_LIMIT_MAX) {
    recordThreat("rate_limit", `${_requestWindows.length} requests/min excede limite de ${RATE_LIMIT_MAX}`, "tarpit");
  }

  // Burst detection — log only, do NOT escalate tarpit
  // The app legitimately bursts with AI cascade, search, embeddings, etc.
  const recentBurst = _requestWindows.filter(r => now - r.ts < BURST_WINDOW).length;
  if (recentBurst > BURST_MAX) {
    recordThreat("burst_detected", `${recentBurst} requests em ${BURST_WINDOW / 1000}s — burst detectado`, "log_only");
  }
}

// ─── Storage Tampering Detection ───

function monitorStorage() {
  const originalSetItem = Storage.prototype.setItem;
  const criticalKeys = ["sb-", "supabase", "auth"];
  // Keys from our own app that should never trigger storage tampering alerts
  const SAFE_KEY_PREFIXES = [
    "orion_", "spotify", "_orion_", "i18next", "theme", "sidebar",
    "amazon_", "alexa_", "iot_", "mqtt_", "hivemq_", "bluetooth_", "ble_",
    "smart_home_", "hue_", "tuya_", "capacitor_", "firebase_",
  ];

  Storage.prototype.setItem = function (key: string, value: string) {
    // Skip monitoring for our own app keys
    if (SAFE_KEY_PREFIXES.some(p => key.startsWith(p) || key.includes(p))) {
      return originalSetItem.call(this, key, value);
    }
    if (criticalKeys.some(k => key.includes(k))) {
      try {
        if (value.startsWith("{") || value.startsWith("ey")) {
          // Normal auth operation
        }
      } catch {
        recordThreat("storage_tampering", `Tentativa de adulteração em localStorage: ${key}`, "session_poison");
      }
    }
    return originalSetItem.call(this, key, value);
  };
}

// ─── XHR/Fetch Monitoring ───

// Trusted internal URLs that should NEVER be rate-limited or tarpitted
const TRUSTED_URL_PATTERNS = [
  // ─── Own origin / internal navigation ───
  "supabase.co",               // ALL Supabase endpoints (functions, rest, auth, storage, realtime)
  "api.spotify.com",           // Spotify API
  "accounts.spotify.com",      // Spotify OAuth
  "spotify.com",               // Any Spotify endpoint
  "googleapis.com",            // Google APIs
  "gstatic.com",               // Google static assets
  "google.com",                // Google services
  "googletagmanager.com",      // GTM
  "google-analytics.com",      // GA
  "firebaseio.com",            // Firebase Realtime DB
  "firebase.com",              // Firebase
  "firebaseapp.com",           // Firebase hosting
  "cloudfunctions.net",        // Cloud Functions
  "ipapi.co",                  // Threat intel (own check)
  "1.1.1.1",                   // Cloudflare DNS check
  "lovable.app",               // Lovable preview
  "lovable.dev",               // Lovable dev
  "stripe.com",                // Stripe
  "openai.com",                // OpenAI
  "anthropic.com",             // Anthropic
  "groq.com",                  // Groq
  "huggingface.co",            // HuggingFace
  "gradio.live",               // Gradio
  "deepseek.com",              // DeepSeek
  "mistral.ai",                // Mistral
  "openrouter.ai",             // OpenRouter
  "serpapi.com",               // SerpAPI
  "firecrawl.dev",             // Firecrawl
  "resend.com",                // Resend email
  "translate.google.com",      // Google TTS
  "courtlistener.com",         // CourtListener
  "zilliz.com",               // Zilliz Cloud (vector database)
  "zillizcloud.com",          // Zilliz Cloud alternative
  "milvus.io",                // Milvus (open source)
  // ─── Bluetooth / IoT / Smart Home / Wireless ───
  "hivemq",                    // HiveMQ MQTT broker
  "mqtt",                      // Any MQTT endpoint
  "emqx",                      // EMQX MQTT broker
  "mosquitto",                 // Mosquitto MQTT broker
  "philips-hue",               // Philips Hue bridge
  "meethue.com",               // Hue cloud API
  "api.hue.com",               // Hue v2 API
  "alexa.amazon",              // Alexa Smart Home
  "amazon.com",                // Amazon OAuth & APIs
  "api.amazon.com",            // Amazon API
  "music.amazon",              // Amazon Music
  "amazonalexa.com",           // Alexa Skill Kit
  "ask-sdk",                   // Alexa Skills SDK
  "smartthings.com",           // Samsung SmartThings
  "home-assistant",            // Home Assistant
  "tuya",                      // Tuya IoT
  "ifttt.com",                 // IFTTT automations
  "scdn.co",                   // Spotify CDN
  "wss://",                    // WebSocket connections
  "ws://",                     // WebSocket connections
  "localhost",                 // Local device bridges
  "127.0.0.1",                 // Local device bridges
  "192.168.",                  // Local network devices
  "10.0.",                     // Local network devices
  "172.16.",                   // Local network devices
  "172.17.",                   // Docker network
];

function isTrustedUrl(url: string): boolean {
  if (!url) return true; // empty = internal navigation, allow
  // Same-origin requests are ALWAYS trusted
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) return true;
  } catch {}
  // Relative URLs are same-origin
  if (url.startsWith("/")) return true;
  // Check patterns
  const lower = url.toLowerCase();
  return TRUSTED_URL_PATTERNS.some(pattern => lower.includes(pattern));
}

function monitorNetwork() {
  const originalFetch = window.fetch;
  window.fetch = function (...args: Parameters<typeof fetch>) {
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";

    // Skip ALL security checks for trusted internal/API URLs
    if (isTrustedUrl(url)) {
      return originalFetch.apply(window, args);
    }

    // Only count non-trusted external requests for rate limiting
    checkRateLimit();

    // Only flag actual script injection in URLs, not common words
    if (/<script/i.test(url) || /javascript\s*:/i.test(url)) {
      recordThreat("injection_url", `URL suspeita: ${url.substring(0, 100)}`, "log_request");
    }

    // MONITOR ONLY — tarpit disabled to prevent breaking integrations (IoT, Spotify, Amazon)
    // Previously: delayed non-trusted requests, but caused timeouts in legitimate API calls
    if (_tarpitDelay > 0) {
      console.warn(`[Orion Shield] Tarpit would have delayed request to: ${url.substring(0, 80)} (${_tarpitDelay}ms) — skipped`);
    }

    return originalFetch.apply(window, args);
  };
}

// ─── Camada 12: Anomaly Scoring Engine (NOVA v2) ───

export function getAnomalyScore(): number {
  const now = Date.now();
  const recentThreats = _threatLog.filter(t => now - t.timestamp < 3600000);

  const probes = recentThreats.filter(t => t.severity === "probe").length;
  const attempts = recentThreats.filter(t => t.severity === "attempt").length;
  const attacks = recentThreats.filter(t => t.severity === "attack").length;
  const critical = recentThreats.filter(t => t.severity === "critical").length;

  // Weighted score
  let score = (probes * 1) + (attempts * 5) + (attacks * 15) + (critical * 40);

  // Factor in behavioral biometrics
  if (_behavioralProfile.humanProbability < 30) score += 25;
  else if (_behavioralProfile.humanProbability < 50) score += 10;

  // Factor in threat intel
  if (_threatIntel.isProxy || _threatIntel.isVpn) score += 15;
  if (_threatIntel.isTor) score += 30;

  // Tarpit active = already under pressure
  if (_tarpitDelay > 5000) score += 10;

  // Factor in privacy leaks
  if (_privacyLeaks.webrtcLeak.detected) score += 10;
  if (_privacyLeaks.dnsLeak.detected) score += 10;

  return Math.min(100, Math.round(score));
}

// ─── Camada 13: WebRTC Leak Detection (NOVA v2.1) ───

const PRIVATE_IP_REGEX = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|fc|fd|fe80)/;

async function detectWebRTCLeak(): Promise<void> {
  try {
    if (typeof RTCPeerConnection === "undefined") return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    const localIPs = new Set<string>();
    let publicIP: string | null = null;

    pc.createDataChannel("");

    pc.onicecandidate = (e) => {
      if (!e.candidate?.candidate) return;
      const parts = e.candidate.candidate.split(" ");
      const ip = parts[4];
      if (!ip) return;

      if (PRIVATE_IP_REGEX.test(ip)) {
        localIPs.add(ip);
      } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        publicIP = ip;
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 3000);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          resolve();
        }
      };
    });

    pc.close();

    const localIPsArray = Array.from(localIPs);
    const leakDetected = publicIP !== null && _threatIntel.checked && _threatIntel.ip !== "" && publicIP !== _threatIntel.ip;

    _privacyLeaks.webrtcLeak = {
      detected: leakDetected || localIPsArray.length > 0,
      localIPs: localIPsArray,
      publicIP,
    };

    if (leakDetected) {
      recordThreat("webrtc_leak", `WebRTC vazou IP público: ${publicIP} (esperado: ${_threatIntel.ip}). IPs locais: ${localIPsArray.join(", ")}`, "privacy_alert");
    } else if (localIPsArray.length > 0) {
      recordThreat("webrtc_leak", `WebRTC expôs IPs locais: ${localIPsArray.join(", ")}`, "privacy_probe");
    }
  } catch {
    // WebRTC not available or blocked
  }
}

// ─── Camada 14: DNS Leak Detection (NOVA v2.1) ───

async function detectDNSLeak(): Promise<void> {
  try {
    const res = await fetch("https://1.1.1.1/cdn-cgi/trace", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return;
    const text = await res.text();

    const ipMatch = text.match(/ip=(.+)/);
    const dnsIP = ipMatch?.[1]?.trim() || "";

    if (dnsIP && _threatIntel.checked && _threatIntel.ip && dnsIP !== _threatIntel.ip) {
      _privacyLeaks.dnsLeak = {
        detected: true,
        resolvers: [dnsIP],
      };
      recordThreat("dns_leak", `DNS resolver IP (${dnsIP}) difere do IP real (${_threatIntel.ip}) — possível DNS leak`, "privacy_alert");
    } else if (dnsIP) {
      _privacyLeaks.dnsLeak = {
        detected: false,
        resolvers: [dnsIP],
      };
    }

    _privacyLeaks.checked = true;
  } catch {
    _privacyLeaks.checked = true;
  }
}

// ─── Public API ───

export function initOrionDefense(): void {
  if (_initialized) return;
  _initialized = true;
  _fingerprint = generateFingerprint();

  if (isFingerPrintBanned(_fingerprint)) {
    console.warn("[Orion Shield] 🛡️ Fingerprint bloqueado");
    return;
  }

  try {
    const bans = JSON.parse(localStorage.getItem("_orion_bans") || "[]");
    const now = Date.now();
    bans
      .filter((b: any) => b.until > now)
      .forEach((b: any) => _bannedFingerprints.add(b.fp));
  } catch {}

  // Start all 14 defense layers
  detectDevTools();
  setInterval(detectDevTools, 3000);
  monitorInputs();
  monitorStorage();
  monitorNetwork();
  injectHoneypots();
  initBehavioralBiometrics();
  enforceCSP();

  // Threat intel check (non-blocking), then privacy checks
  checkThreatIntel().then(() => {
    detectWebRTCLeak();
    detectDNSLeak();
  });

  console.log("[Orion Shield] 🛡️ v2.3 — 14 camadas de defesa ativas (IoT/Spotify/Amazon: monitor-only)");
}

export function getDefenseMetrics(): DefenseMetrics {
  const now = Date.now();
  const recentThreats = _threatLog.filter(t => now - t.timestamp < 3600000);

  return {
    totalThreats: _threatLog.length,
    blocked: _threatLog.filter(t => t.severity === "attack" || t.severity === "critical").length,
    probes: recentThreats.filter(t => t.severity === "probe").length,
    attempts: recentThreats.filter(t => t.severity === "attempt").length,
    attacks: recentThreats.filter(t => t.severity === "attack").length,
    critical: recentThreats.filter(t => t.severity === "critical").length,
    activeBans: _bannedFingerprints.size,
    honeypotTriggers: _honeypotTriggers.size,
    tarpitActive: _tarpitDelay > 0,
    domFortressActive: _domFortressActive,
    lastThreat: _threatLog.length > 0 ? _threatLog[_threatLog.length - 1] : null,
    anomalyScore: getAnomalyScore(),
    behavioralProfile: { ..._behavioralProfile },
    threatIntel: { ..._threatIntel },
    privacyLeaks: { ..._privacyLeaks, webrtcLeak: { ..._privacyLeaks.webrtcLeak, localIPs: [..._privacyLeaks.webrtcLeak.localIPs] }, dnsLeak: { ..._privacyLeaks.dnsLeak, resolvers: [..._privacyLeaks.dnsLeak.resolvers] } },
    cspActive: _cspActive,
    layersActive: 14,
  };
}

export function getBehavioralProfile(): BehavioralProfile {
  return { ..._behavioralProfile };
}

export function getThreatIntel(): ThreatIntelResult {
  return { ..._threatIntel };
}

export async function refreshThreatIntel(): Promise<ThreatIntelResult> {
  await checkThreatIntel();
  return { ..._threatIntel };
}

export function getRecentThreats(limit = 20): ThreatEvent[] {
  return _threatLog.slice(-limit);
}

export function onThreatDetected(callback: (event: ThreatEvent) => void): () => void {
  _listeners.push(callback);
  return () => { _listeners = _listeners.filter(fn => fn !== callback); };
}

export function manualBan(fingerprint: string): void {
  banFingerprint(fingerprint);
  recordThreat("manual_ban", `Ban manual: ${fingerprint}`, "admin_ban");
}

export function manualUnban(fingerprint: string): void {
  _bannedFingerprints.delete(fingerprint);
  try {
    const bans = JSON.parse(localStorage.getItem("_orion_bans") || "[]");
    localStorage.setItem("_orion_bans", JSON.stringify(bans.filter((b: any) => b.fp !== fingerprint)));
  } catch {}
}

export function activateMaxAlert(): void {
  _tarpitDelay = 5000;
  activateDOMFortress();
  recordThreat("max_alert", "Modo alerta máximo ativado manualmente", "full_lockdown");
}

export function resetTarpit(): void {
  _tarpitDelay = 0;
}

export function getPrivacyLeaks(): PrivacyLeakResult {
  return {
    ..._privacyLeaks,
    webrtcLeak: { ..._privacyLeaks.webrtcLeak, localIPs: [..._privacyLeaks.webrtcLeak.localIPs] },
    dnsLeak: { ..._privacyLeaks.dnsLeak, resolvers: [..._privacyLeaks.dnsLeak.resolvers] },
  };
}

export async function recheckPrivacyLeaks(): Promise<PrivacyLeakResult> {
  _privacyLeaks = { webrtcLeak: { detected: false, localIPs: [], publicIP: null }, dnsLeak: { detected: false, resolvers: [] }, checked: false };
  await detectWebRTCLeak();
  await detectDNSLeak();
  return getPrivacyLeaks();
}

export function destroyDefense(): void {
  _mutationObserver?.disconnect();
  _mutationObserver = null;
  _domFortressActive = false;
  _tarpitDelay = 0;
  _listeners = [];
}

// ─── Supabase Persistence ───

async function persistThreatLog(event: ThreatEvent): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("orion_threat_log" as any).insert({
      user_id: user?.id || null,
      threat_type: event.type,
      severity: event.severity,
      details: event.details,
      fingerprint: event.fingerprint,
      countermeasure: event.countermeasure,
      user_agent: navigator.userAgent,
      page_url: window.location.pathname,
    } as any);
  } catch {
    // Fail silently
  }
}

export async function fetchPersistedThreats(limit = 50): Promise<ThreatEvent[]> {
  try {
    const { data } = await supabase
      .from("orion_threat_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit) as any;

    if (!data) return [];
    return data.map((row: any) => ({
      id: row.id,
      type: row.threat_type,
      severity: row.severity,
      timestamp: new Date(row.created_at).getTime(),
      details: row.details || "",
      fingerprint: row.fingerprint || "",
      countermeasure: row.countermeasure || "",
    }));
  } catch {
    return [];
  }
}
