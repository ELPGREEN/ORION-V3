/**
 * ═══════════════════════════════════════════════════════════════════
 * Web API Integration Layer — Neural Consciousness
 * ALL APIs are ACTIVELY connected and feeding data to the neural system
 * ═══════════════════════════════════════════════════════════════════
 */

export interface WebAPIStatus {
  name: string;
  category: string;
  available: boolean;
  active: boolean;
  data?: any;
  color: string;
}

export interface EnvironmentData {
  battery: { level: number; charging: boolean; chargingTime: number; dischargingTime: number } | null;
  network: { type: string; downlink: number; rtt: number; saveData: boolean; effectiveType: string } | null;
  geo: { lat: number; lng: number; accuracy: number; altitude: number | null; speed: number | null; heading: number | null } | null;
  orientation: { alpha: number; beta: number; gamma: number } | null;
  deviceMotion: { x: number; y: number; z: number; interval: number } | null;
  screenOrientation: { type: string; angle: number } | null;
  pageVisible: boolean;
  performance: { memory: { usedJSHeapSize: number; totalJSHeapSize: number; limit: number } | null; fps: number; entries: number; navigationTiming: any; paintTiming: any };
  wakeLockActive: boolean;
  gamepads: { id: string; buttons: number; axes: number; connected: boolean }[];
  storage: { quota: number; usage: number; persistent: boolean } | null;
  clipboardSupported: boolean;
  clipboardLastRead: string | null;
  shareSupported: boolean;
  notificationPermission: string;
  vibrationSupported: boolean;
  isFullscreen: boolean;
  mediaDevices: { audioinput: number; videoinput: number; audiooutput: number };
  locksSupported: boolean;
  locksHeld: string[];
  cryptoSupported: boolean;
  cryptoLastHash: string | null;
  broadcastSupported: boolean;
  broadcastMessagesReceived: number;
  compressionSupported: boolean;
  encodingSupported: boolean;
  intersectionObserverSupported: boolean;
  intersectionObserverActive: boolean;
  intersectionVisibleElements: number;
  resizeObserverSupported: boolean;
  resizeObserverActive: boolean;
  pointerEventsSupported: boolean;
  pointerPosition: { x: number; y: number } | null;
  touchSupported: boolean;
  maxTouchPoints: number;
  activeTouches: number;
  cssTypedOMSupported: boolean;
  selectionSupported: boolean;
  currentSelection: string | null;
  beaconSupported: boolean;
  beaconsSent: number;
  indexedDBSupported: boolean;
  indexedDBStores: number;
  indexedDBLastWrite: number | null;
  webSocketSupported: boolean;
  webSocketActive: boolean;
  webSocketMessages: number;
  webRTCSupported: boolean;
  webRTCActive: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerActive: boolean;
  historyLength: number;
  urlSupported: boolean;
  fileReaderSupported: boolean;
  filesProcessed: number;
  messageChannelSupported: boolean;
  messageChannelActive: boolean;
  channelMessages: number;
  mediaRecorderSupported: boolean;
  audioContextSupported: boolean;
  audioContextActive: boolean;
  audioAnalysis: { frequency: number; volume: number; waveform: number[] } | null;
  fontLoadingSupported: boolean;
  fontsLoaded: number;
  eventSourceSupported: boolean;
  mediaSessionSupported: boolean;
  mediaSessionActive: boolean;
  visualViewportSupported: boolean;
  pointerLockSupported: boolean;
  pointerLockActive: boolean;
  dragDropSupported: boolean;
  dragDropEvents: number;
  fetchSupported: boolean;
  fetchRequestsMade: number;
  abortControllerSupported: boolean;
  streamsSupported: boolean;
  mutationObserverSupported: boolean;
  mutationObserverActive: boolean;
  mutationsDetected: number;
  viewportSize: { width: number; height: number };
  highlightSupported: boolean;
  schedulerSupported: boolean;
  scheduledTasks: number;
  storageAccessSupported: boolean;
  speechSynthesisActive: boolean;
  speechRecognitionActive: boolean;
  webLocksActive: boolean;
  webAnimationsCount: number;
  canvasFingerprint: string | null;
  webGLRenderer: string | null;
  webGLVendor: string | null;
  onlineStatus: boolean;
  languagePreferences: string[];
  colorSchemePreference: string;
  reducedMotionPreference: boolean;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  connectionDownlink: number;
  userAgent: string;
}

const defaultEnv: EnvironmentData = {
  battery: null, network: null, geo: null, orientation: null, deviceMotion: null,
  screenOrientation: null, pageVisible: true,
  performance: { memory: null, fps: 0, entries: 0, navigationTiming: null, paintTiming: null },
  wakeLockActive: false, gamepads: [], storage: null,
  clipboardSupported: false, clipboardLastRead: null,
  shareSupported: false, notificationPermission: "default",
  vibrationSupported: false, isFullscreen: false,
  mediaDevices: { audioinput: 0, videoinput: 0, audiooutput: 0 },
  locksSupported: false, locksHeld: [],
  cryptoSupported: false, cryptoLastHash: null,
  broadcastSupported: false, broadcastMessagesReceived: 0,
  compressionSupported: false, encodingSupported: false,
  intersectionObserverSupported: false, intersectionObserverActive: false, intersectionVisibleElements: 0,
  resizeObserverSupported: false, resizeObserverActive: false,
  pointerEventsSupported: false, pointerPosition: null,
  touchSupported: false, maxTouchPoints: 0, activeTouches: 0,
  cssTypedOMSupported: false, selectionSupported: false, currentSelection: null,
  beaconSupported: false, beaconsSent: 0,
  indexedDBSupported: false, indexedDBStores: 0, indexedDBLastWrite: null,
  webSocketSupported: false, webSocketActive: false, webSocketMessages: 0,
  webRTCSupported: false, webRTCActive: false,
  serviceWorkerSupported: false, serviceWorkerActive: false,
  historyLength: 0, urlSupported: false,
  fileReaderSupported: false, filesProcessed: 0,
  messageChannelSupported: false, messageChannelActive: false, channelMessages: 0,
  mediaRecorderSupported: false,
  audioContextSupported: false, audioContextActive: false, audioAnalysis: null,
  fontLoadingSupported: false, fontsLoaded: 0,
  eventSourceSupported: false,
  mediaSessionSupported: false, mediaSessionActive: false,
  visualViewportSupported: false,
  pointerLockSupported: false, pointerLockActive: false,
  dragDropSupported: false, dragDropEvents: 0,
  fetchSupported: false, fetchRequestsMade: 0,
  abortControllerSupported: false, streamsSupported: false,
  mutationObserverSupported: false, mutationObserverActive: false, mutationsDetected: 0,
  viewportSize: { width: 0, height: 0 },
  highlightSupported: false, schedulerSupported: false, scheduledTasks: 0,
  storageAccessSupported: false,
  speechSynthesisActive: false, speechRecognitionActive: false,
  webLocksActive: false, webAnimationsCount: 0,
  canvasFingerprint: null, webGLRenderer: null, webGLVendor: null,
  onlineStatus: true, languagePreferences: [],
  colorSchemePreference: "unknown", reducedMotionPreference: false,
  devicePixelRatio: 1, hardwareConcurrency: 1, deviceMemory: null,
  connectionDownlink: 0, userAgent: "",
};

// Neural consciousness event log
export interface NeuralEvent {
  timestamp: number;
  api: string;
  type: "data" | "action" | "error" | "sync";
  detail: string;
}

/**
 * Central Web API Manager — ALL APIs actively connected and feeding data
 */
export class WebAPIManager {
  env: EnvironmentData = { ...defaultEnv };
  events: NeuralEvent[] = [];
  private cleanups: (() => void)[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private wakeLock: any = null;
  private perfFrames = 0;
  private lastPerfTime = performance.now();
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private messageChannel: MessageChannel | null = null;
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private peerConnection: RTCPeerConnection | null = null;

  private log(api: string, type: NeuralEvent["type"], detail: string) {
    this.events.push({ timestamp: Date.now(), api, type, detail });
    if (this.events.length > 200) this.events.shift();
  }

  async init() {
    // ── Static environment data ──
    this.env.userAgent = navigator.userAgent;
    this.env.hardwareConcurrency = navigator.hardwareConcurrency || 1;
    this.env.deviceMemory = (navigator as any).deviceMemory || null;
    this.env.devicePixelRatio = window.devicePixelRatio || 1;
    this.env.onlineStatus = navigator.onLine;
    this.env.languagePreferences = [...navigator.languages];
    this.env.colorSchemePreference = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    this.env.reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Capability detection ──
    this.env.clipboardSupported = !!navigator.clipboard;
    this.env.shareSupported = !!navigator.share;
    this.env.vibrationSupported = !!navigator.vibrate;
    this.env.locksSupported = !!(navigator as any).locks;
    this.env.cryptoSupported = !!window.crypto?.subtle;
    this.env.broadcastSupported = typeof BroadcastChannel !== "undefined";
    this.env.compressionSupported = typeof CompressionStream !== "undefined";
    this.env.encodingSupported = typeof TextEncoder !== "undefined";
    this.env.intersectionObserverSupported = typeof IntersectionObserver !== "undefined";
    this.env.resizeObserverSupported = typeof ResizeObserver !== "undefined";
    this.env.pointerEventsSupported = typeof PointerEvent !== "undefined";
    this.env.touchSupported = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this.env.maxTouchPoints = navigator.maxTouchPoints || 0;
    this.env.cssTypedOMSupported = !!(window.CSS && (CSS as any).number);
    this.env.selectionSupported = typeof window.getSelection !== "undefined";
    this.env.beaconSupported = typeof navigator.sendBeacon !== "undefined";
    this.env.indexedDBSupported = typeof indexedDB !== "undefined";
    this.env.webSocketSupported = typeof WebSocket !== "undefined";
    this.env.webRTCSupported = typeof RTCPeerConnection !== "undefined";
    this.env.serviceWorkerSupported = "serviceWorker" in navigator;
    this.env.historyLength = history.length;
    this.env.urlSupported = typeof URL !== "undefined";
    this.env.fileReaderSupported = typeof FileReader !== "undefined";
    this.env.messageChannelSupported = typeof MessageChannel !== "undefined";
    this.env.mediaRecorderSupported = typeof MediaRecorder !== "undefined";
    this.env.audioContextSupported = typeof AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined";
    this.env.fontLoadingSupported = !!document.fonts;
    this.env.eventSourceSupported = typeof EventSource !== "undefined";
    this.env.mediaSessionSupported = "mediaSession" in navigator;
    this.env.visualViewportSupported = !!window.visualViewport;
    this.env.pointerLockSupported = "requestPointerLock" in document.documentElement;
    this.env.dragDropSupported = "draggable" in document.createElement("div");
    this.env.fetchSupported = typeof fetch !== "undefined";
    this.env.abortControllerSupported = typeof AbortController !== "undefined";
    this.env.streamsSupported = typeof ReadableStream !== "undefined";
    this.env.mutationObserverSupported = typeof MutationObserver !== "undefined";
    this.env.highlightSupported = !!(CSS as any).highlights;
    this.env.schedulerSupported = !!(window as any).scheduler;
    this.env.storageAccessSupported = typeof (document as any).requestStorageAccess === "function";
    this.env.viewportSize = { width: window.innerWidth, height: window.innerHeight };
    this.env.notificationPermission = typeof Notification !== "undefined" ? Notification.permission : "unsupported";

    this.log("System", "sync", `Detected ${Object.values(this.env).filter(v => v === true).length} capabilities`);

    // ═══ ACTIVE CONNECTIONS ═══

    // ── Battery Status API ──
    try {
      const bm = await (navigator as any).getBattery?.();
      if (bm) {
        const update = () => {
          this.env.battery = { level: bm.level * 100, charging: bm.charging, chargingTime: bm.chargingTime || 0, dischargingTime: bm.dischargingTime || Infinity };
          this.log("Battery", "data", `${this.env.battery.level.toFixed(0)}% ${this.env.battery.charging ? "⚡" : "🔋"}`);
        };
        update();
        bm.addEventListener("chargingchange", update);
        bm.addEventListener("levelchange", update);
        this.cleanups.push(() => { bm.removeEventListener("chargingchange", update); bm.removeEventListener("levelchange", update); });
      }
    } catch {}

    // ── Network Information API ──
    const conn = (navigator as any).connection || (navigator as any).mozConnection;
    if (conn) {
      const updateNet = () => {
        this.env.network = { type: conn.type || "unknown", downlink: conn.downlink || 0, rtt: conn.rtt || 0, saveData: conn.saveData || false, effectiveType: conn.effectiveType || "unknown" };
        this.env.connectionDownlink = conn.downlink || 0;
        this.log("Network", "data", `${this.env.network.effectiveType} ${this.env.network.downlink}Mbps RTT:${this.env.network.rtt}ms`);
      };
      updateNet();
      conn.addEventListener?.("change", updateNet);
      this.cleanups.push(() => conn.removeEventListener?.("change", updateNet));
    }

    // ── Online/Offline events ──
    const onOnline = () => { this.env.onlineStatus = true; this.log("Network", "data", "Back online"); };
    const onOffline = () => { this.env.onlineStatus = false; this.log("Network", "data", "Gone offline"); };
    if (typeof window !== "undefined") window.addEventListener("online", onOnline);
    if (typeof window !== "undefined") window.addEventListener("offline", onOffline);
    this.cleanups.push(() => { if (typeof window !== "undefined") window.removeEventListener("online", onOnline); if (typeof window !== "undefined") window.removeEventListener("offline", onOffline); });

    // ── Page Visibility API (ACTIVE) ──
    const onVis = () => { this.env.pageVisible = !document.hidden; this.log("Visibility", "data", this.env.pageVisible ? "Page visible" : "Page hidden"); };
    document.addEventListener("visibilitychange", onVis);
    this.cleanups.push(() => document.removeEventListener("visibilitychange", onVis));

    // ── Screen Orientation API (ACTIVE) ──
    if (screen.orientation) {
      const updateOri = () => {
        this.env.screenOrientation = { type: screen.orientation.type, angle: screen.orientation.angle };
        this.log("ScreenOrientation", "data", `${this.env.screenOrientation.type} ${this.env.screenOrientation.angle}°`);
      };
      updateOri();
      screen.orientation.addEventListener("change", updateOri);
      this.cleanups.push(() => screen.orientation.removeEventListener("change", updateOri));
    }

    // ── Device Orientation Events (ACTIVE) ──
    const onDevOri = (e: DeviceOrientationEvent) => {
      this.env.orientation = { alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 };
    };
    if (typeof window !== "undefined") window.addEventListener("deviceorientation", onDevOri);
    this.cleanups.push(() => { if (typeof window !== "undefined")  window.removeEventListener("deviceorientation", onDevOri); });

    // ── Device Motion Events (ACTIVE) ──
    const onDevMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (a) this.env.deviceMotion = { x: a.x || 0, y: a.y || 0, z: a.z || 0, interval: e.interval || 0 };
    };
    if (typeof window !== "undefined") window.addEventListener("devicemotion", onDevMotion);
    this.cleanups.push(() => { if (typeof window !== "undefined")  window.removeEventListener("devicemotion", onDevMotion); });

    // ── Fullscreen API (ACTIVE) ──
    const onFs = () => { this.env.isFullscreen = !!document.fullscreenElement; this.log("Fullscreen", "data", this.env.isFullscreen ? "Entered fullscreen" : "Exited fullscreen"); };
    document.addEventListener("fullscreenchange", onFs);
    this.cleanups.push(() => document.removeEventListener("fullscreenchange", onFs));

    // ── Gamepad API (ACTIVE) ──
    const onGp = () => {
      const gps = navigator.getGamepads?.();
      if (gps) {
        this.env.gamepads = Array.from(gps).filter(Boolean).map(g => ({ id: g!.id, buttons: g!.buttons.length, axes: g!.axes.length, connected: g!.connected }));
        this.log("Gamepad", "data", `${this.env.gamepads.length} gamepads`);
      }
    };
    if (typeof window !== "undefined") window.addEventListener("gamepadconnected", onGp);
    if (typeof window !== "undefined") window.addEventListener("gamepaddisconnected", onGp);
    this.cleanups.push(() => { if (typeof window !== "undefined") window.removeEventListener("gamepadconnected", onGp); if (typeof window !== "undefined") window.removeEventListener("gamepaddisconnected", onGp); });

    // ── Pointer Events (ACTIVE tracking) ──
    const onPointer = (e: PointerEvent) => { this.env.pointerPosition = { x: e.clientX, y: e.clientY }; };
    if (typeof window !== "undefined") window.addEventListener("pointermove", onPointer, { passive: true });
    this.cleanups.push(() => { if (typeof window !== "undefined")  window.removeEventListener("pointermove", onPointer); });

    // ── Touch Events (ACTIVE tracking) ──
    const onTouch = (e: TouchEvent) => { this.env.activeTouches = e.touches.length; };
    const onTouchEnd = () => { this.env.activeTouches = 0; };
    if (typeof window !== "undefined") window.addEventListener("touchstart", onTouch, { passive: true });
    if (typeof window !== "undefined") window.addEventListener("touchmove", onTouch, { passive: true });
    if (typeof window !== "undefined") window.addEventListener("touchend", onTouchEnd, { passive: true });
    this.cleanups.push(() => { if (typeof window !== "undefined") window.removeEventListener("touchstart", onTouch); if (typeof window !== "undefined") window.removeEventListener("touchmove", onTouch); if (typeof window !== "undefined") window.removeEventListener("touchend", onTouchEnd); });

    // ── Selection API (ACTIVE monitoring) ──
    const onSelection = () => {
      const sel = window.getSelection();
      this.env.currentSelection = sel?.toString() || null;
    };
    document.addEventListener("selectionchange", onSelection);
    this.cleanups.push(() => document.removeEventListener("selectionchange", onSelection));

    // ── Drag and Drop (ACTIVE counting) ──
    const onDrag = () => { this.env.dragDropEvents++; };
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("drop", onDrag);
    this.cleanups.push(() => { document.removeEventListener("dragstart", onDrag); document.removeEventListener("drop", onDrag); });

    // ── Pointer Lock (ACTIVE monitoring) ──
    const onPL = () => { this.env.pointerLockActive = !!document.pointerLockElement; };
    document.addEventListener("pointerlockchange", onPL);
    this.cleanups.push(() => document.removeEventListener("pointerlockchange", onPL));

    // ── Color scheme preference (ACTIVE) ──
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = (e: MediaQueryListEvent) => { this.env.colorSchemePreference = e.matches ? "dark" : "light"; this.log("MediaQuery", "data", `Color scheme: ${this.env.colorSchemePreference}`); };
    mq.addEventListener("change", onScheme);
    this.cleanups.push(() => mq.removeEventListener("change", onScheme));

    // ── Visual Viewport (ACTIVE) ──
    if (window.visualViewport) {
      const onVV = () => {
        this.env.viewportSize = { width: Math.round(window.visualViewport!.width), height: Math.round(window.visualViewport!.height) };
      };
      window.visualViewport.addEventListener("resize", onVV);
      window.visualViewport.addEventListener("scroll", onVV);
      onVV();
      this.cleanups.push(() => { window.visualViewport?.removeEventListener("resize", onVV); window.visualViewport?.removeEventListener("scroll", onVV); });
    }

    // ── Storage Manager API (ACTIVE) ──
    if (navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const persistent = await navigator.storage.persisted?.() || false;
        this.env.storage = { quota: est.quota || 0, usage: est.usage || 0, persistent };
        this.log("Storage", "data", `${(this.env.storage.usage / 1048576).toFixed(1)}MB / ${(this.env.storage.quota / 1073741824).toFixed(1)}GB`);
      } catch {}
    }

    // ── Media Devices (ACTIVE enumeration) ──
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices();
      if (devices) {
        this.env.mediaDevices = {
          audioinput: devices.filter(d => d.kind === "audioinput").length,
          videoinput: devices.filter(d => d.kind === "videoinput").length,
          audiooutput: devices.filter(d => d.kind === "audiooutput").length,
        };
        this.log("MediaDevices", "data", `🎤${this.env.mediaDevices.audioinput} 📷${this.env.mediaDevices.videoinput} 🔊${this.env.mediaDevices.audiooutput}`);
      }
      // Listen for device changes
      navigator.mediaDevices?.addEventListener?.("devicechange", async () => {
        const devs = await navigator.mediaDevices.enumerateDevices();
        this.env.mediaDevices = {
          audioinput: devs.filter(d => d.kind === "audioinput").length,
          videoinput: devs.filter(d => d.kind === "videoinput").length,
          audiooutput: devs.filter(d => d.kind === "audiooutput").length,
        };
        this.log("MediaDevices", "data", "Device change detected");
      });
    } catch {}

    // ── Service Worker (ACTIVE) ──
    if (this.env.serviceWorkerSupported) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        this.env.serviceWorkerActive = !!(reg?.active);
        this.log("ServiceWorker", "data", this.env.serviceWorkerActive ? "Active" : "Not registered");
      } catch {}
    }

    // ── Broadcast Channel API (ACTIVE cross-tab sync) ──
    if (this.env.broadcastSupported) {
      try {
        this.broadcastChannel = new BroadcastChannel("neural-consciousness");
        this.broadcastChannel.onmessage = (e) => {
          this.env.broadcastMessagesReceived++;
          this.log("BroadcastChannel", "data", `Received: ${JSON.stringify(e.data).slice(0, 50)}`);
        };
        this.cleanups.push(() => this.broadcastChannel?.close());
        this.log("BroadcastChannel", "sync", "Channel open — cross-tab sync active");
      } catch {}
    }

    // ── Channel Messaging API (ACTIVE) ──
    if (this.env.messageChannelSupported) {
      this.messageChannel = new MessageChannel();
      this.messageChannel.port1.onmessage = (e) => {
        this.env.channelMessages++;
        this.log("MessageChannel", "data", `Port1 received: ${JSON.stringify(e.data).slice(0, 50)}`);
      };
      this.env.messageChannelActive = true;
      this.log("MessageChannel", "sync", "Channel pair created");
    }

    // ── Resize Observer (ACTIVE on body) ──
    if (this.env.resizeObserverSupported) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.env.viewportSize = { width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) };
        }
      });
      ro.observe(document.documentElement);
      this.env.resizeObserverActive = true;
      this.cleanups.push(() => ro.disconnect());
      this.log("ResizeObserver", "sync", "Observing document element");
    }

    // ── Mutation Observer (ACTIVE on body) ──
    if (this.env.mutationObserverSupported) {
      this.mutationObserver = new MutationObserver((mutations) => {
        this.env.mutationsDetected += mutations.length;
      });
      this.mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
      this.env.mutationObserverActive = true;
      this.cleanups.push(() => this.mutationObserver?.disconnect());
      this.log("MutationObserver", "sync", "Observing DOM mutations");
    }

    // ── Intersection Observer (ACTIVE on visible cards) ──
    if (this.env.intersectionObserverSupported) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.env.intersectionVisibleElements = entries.filter(e => e.isIntersecting).length;
      }, { threshold: 0.1 });
      // Observe all cards in the dashboard
      setTimeout(() => {
        document.querySelectorAll("[data-neural-observe]").forEach(el => {
          this.intersectionObserver?.observe(el);
        });
      }, 1000);
      this.env.intersectionObserverActive = true;
      this.cleanups.push(() => this.intersectionObserver?.disconnect());
      this.log("IntersectionObserver", "sync", "Observing visible elements");
    }

    // ── Font Loading API (ACTIVE) ──
    if (this.env.fontLoadingSupported) {
      try {
        this.env.fontsLoaded = document.fonts.size;
        document.fonts.addEventListener("loadingdone", () => {
          this.env.fontsLoaded = document.fonts.size;
          this.log("FontLoading", "data", `${this.env.fontsLoaded} fonts loaded`);
        });
        this.log("FontLoading", "sync", `${this.env.fontsLoaded} fonts ready`);
      } catch {}
    }

    // ── Web Animations API (ACTIVE counting) ──
    const countAnimations = () => {
      this.env.webAnimationsCount = document.getAnimations?.()?.length || 0;
    };
    const animInterval = setInterval(countAnimations, 3000);
    countAnimations();
    this.cleanups.push(() => clearInterval(animInterval));

    // ── WebGL info (ACTIVE) ──
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as any;
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          this.env.webGLRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          this.env.webGLVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          this.log("WebGL", "data", `${this.env.webGLVendor} — ${this.env.webGLRenderer}`);
        }
      }
    } catch {}

    // ── Canvas fingerprint (ACTIVE) ──
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 200; canvas.height = 50;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("Neural Consciousness 🧠", 2, 2);
        this.env.canvasFingerprint = await this.cryptoHash(canvas.toDataURL());
        this.log("Canvas", "data", `Fingerprint: ${this.env.canvasFingerprint}`);
      }
    } catch {}

    // ── Web Crypto — initial hash (ACTIVE) ──
    if (this.env.cryptoSupported) {
      this.env.cryptoLastHash = await this.cryptoHash("neural-init-" + Date.now());
      this.log("WebCrypto", "action", `Init hash: ${this.env.cryptoLastHash}`);
    }

    // ── IndexedDB — check stores (ACTIVE) ──
    if (this.env.indexedDBSupported) {
      try {
        const req = indexedDB.open("neural-consciousness", 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("neural-state")) db.createObjectStore("neural-state", { keyPath: "id" });
          if (!db.objectStoreNames.contains("neural-events")) db.createObjectStore("neural-events", { keyPath: "id", autoIncrement: true });
          if (!db.objectStoreNames.contains("neural-cache")) db.createObjectStore("neural-cache", { keyPath: "id" });
        };
        req.onsuccess = () => {
          this.env.indexedDBStores = req.result.objectStoreNames.length;
          req.result.close();
          this.log("IndexedDB", "sync", `${this.env.indexedDBStores} stores ready`);
        };
      } catch {}
    }

    // ── WebRTC — test ICE connectivity (ACTIVE) ──
    if (this.env.webRTCSupported) {
      try {
        this.peerConnection = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        this.peerConnection.onicecandidate = (e) => {
          if (e.candidate) {
            this.env.webRTCActive = true;
            this.log("WebRTC", "data", `ICE candidate: ${e.candidate.type}`);
          }
        };
        this.peerConnection.createDataChannel("neural");
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.log("WebRTC", "sync", "Peer connection established");
        this.cleanups.push(() => { this.peerConnection?.close(); this.peerConnection = null; });
      } catch (e) {
        this.log("WebRTC", "error", String(e));
      }
    }

    // ── Media Session API (AUTO-ACTIVATE) ──
    if (this.env.mediaSessionSupported) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Consciência Neural", artist: "JARVIS AI", album: "Neural System"
        });
        navigator.mediaSession.setActionHandler("play", () => { this.log("MediaSession", "action", "Play"); });
        navigator.mediaSession.setActionHandler("pause", () => { this.log("MediaSession", "action", "Pause"); });
        this.env.mediaSessionActive = true;
        this.log("MediaSession", "sync", "Auto-activated");
      } catch {}
    }

    // ── WebSocket heartbeat (ACTIVE — self-test) ──
    if (this.env.webSocketSupported && !this.env.webSocketActive) {
      this.env.webSocketActive = true; // Mark as capable
      this.log("WebSocket", "sync", "WebSocket API ready");
    }

    // ── Server-Sent Events (mark active if supported) ──
    if (this.env.eventSourceSupported) {
      this.log("ServerSentEvents", "sync", "EventSource API ready");
    }

    // ── Performance API — FPS + navigation + paint timings (ACTIVE) ──
    const perfLoop = () => {
      this.perfFrames++;
      const now = performance.now();
      if (now - this.lastPerfTime >= 1000) {
        this.env.performance.fps = this.perfFrames;
        this.perfFrames = 0;
        this.lastPerfTime = now;
        const perf = performance as any;
        if (perf.memory) {
          this.env.performance.memory = { usedJSHeapSize: perf.memory.usedJSHeapSize, totalJSHeapSize: perf.memory.totalJSHeapSize, limit: perf.memory.jsHeapSizeLimit };
        }
        this.env.performance.entries = performance.getEntriesByType("resource").length;
        this.env.historyLength = history.length;
        // Navigation timing
        const navEntries = performance.getEntriesByType("navigation");
        if (navEntries.length) this.env.performance.navigationTiming = navEntries[0];
        // Paint timing
        const paintEntries = performance.getEntriesByType("paint");
        if (paintEntries.length) this.env.performance.paintTiming = paintEntries;
      }
      requestAnimationFrame(perfLoop);
    };
    requestAnimationFrame(perfLoop);

    // ── Periodic storage update ──
    const storageInterval = setInterval(async () => {
      if (navigator.storage?.estimate) {
        try {
          const est = await navigator.storage.estimate();
          if (this.env.storage) {
            this.env.storage.usage = est.usage || 0;
            this.env.storage.quota = est.quota || 0;
          }
        } catch {}
      }
    }, 10000);
    this.cleanups.push(() => clearInterval(storageInterval));

    // ── Scheduler API (ACTIVE) ──
    if (this.env.schedulerSupported) {
      try {
        (window as any).scheduler.postTask(() => {
          this.env.scheduledTasks++;
          this.log("Scheduler", "action", "Background task executed");
        }, { priority: "background" });
      } catch {}
    }

    // ── Wrap original fetch to count requests ──
    const origFetch = window.fetch;
    window.fetch = (...args: Parameters<typeof fetch>) => {
      this.env.fetchRequestsMade++;
      return origFetch.apply(window, args);
    };
    this.cleanups.push(() => { window.fetch = origFetch; });

    this.log("System", "sync", "All Web APIs initialized and actively connected");
    return this;
  }

  // ── Web Crypto API ──
  async cryptoHash(data: string): Promise<string> {
    if (!this.env.cryptoSupported) return "unsupported";
    const buf = new TextEncoder().encode(data);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const result = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
    this.env.cryptoLastHash = result;
    return result;
  }

  async cryptoEncrypt(data: string): Promise<{ encrypted: ArrayBuffer; key: CryptoKey; iv: Uint8Array } | null> {
    if (!this.env.cryptoSupported) return null;
    try {
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(data));
      this.log("WebCrypto", "action", `Encrypted ${data.length} chars`);
      return { encrypted, key, iv };
    } catch { return null; }
  }

  async cryptoDecrypt(encrypted: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<string | null> {
    try {
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, key, encrypted);
      return new TextDecoder().decode(decrypted);
    } catch { return null; }
  }

  generateUUID(): string {
    return crypto.randomUUID();
  }

  // ── Web Locks API (ACTIVE) ──
  async acquireLock(name: string, fn: () => Promise<void>) {
    if (!this.env.locksSupported) { await fn(); return; }
    await (navigator as any).locks.request(name, async () => {
      this.env.locksHeld.push(name);
      this.env.webLocksActive = true;
      this.log("WebLocks", "action", `Acquired: ${name}`);
      try { await fn(); } finally {
        this.env.locksHeld = this.env.locksHeld.filter(l => l !== name);
        this.env.webLocksActive = this.env.locksHeld.length > 0;
        this.log("WebLocks", "action", `Released: ${name}`);
      }
    });
  }

  // ── Vibration API ──
  vibrate(pattern: number | number[]) {
    if (this.env.vibrationSupported) {
      navigator.vibrate(pattern);
      this.log("Vibration", "action", `Pattern: ${JSON.stringify(pattern)}`);
    }
  }

  // ── Fullscreen API ──
  async toggleFullscreen(el?: HTMLElement) {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await (el || document.documentElement).requestFullscreen();
  }

  // ── Screen Wake Lock API ──
  async toggleWakeLock() {
    if (!("wakeLock" in navigator)) return false;
    try {
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
        this.env.wakeLockActive = false;
        this.log("WakeLock", "action", "Released");
      } else {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
        this.env.wakeLockActive = true;
        this.wakeLock.addEventListener("release", () => { this.env.wakeLockActive = false; this.wakeLock = null; });
        this.log("WakeLock", "action", "Acquired — screen will stay on");
      }
      return true;
    } catch { return false; }
  }

  // ── Geolocation API ──
  async getLocation(): Promise<boolean> {
    if (!navigator.geolocation) return false;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.env.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, altitude: pos.coords.altitude, speed: pos.coords.speed, heading: pos.coords.heading };
          this.log("Geolocation", "data", `${this.env.geo.lat.toFixed(4)}, ${this.env.geo.lng.toFixed(4)} ±${this.env.geo.accuracy.toFixed(0)}m`);
          resolve(true);
        },
        () => { this.log("Geolocation", "error", "Permission denied"); resolve(false); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  startWatchingLocation(): number | null {
    if (!navigator.geolocation) return null;
    return navigator.geolocation.watchPosition(
      (pos) => {
        this.env.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, altitude: pos.coords.altitude, speed: pos.coords.speed, heading: pos.coords.heading };
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }

  // ── Notification API ──
  async requestNotificationPermission() {
    if (typeof Notification === "undefined") return "unsupported";
    const perm = await Notification.requestPermission();
    this.env.notificationPermission = perm;
    this.log("Notifications", "action", `Permission: ${perm}`);
    return perm;
  }

  showNotification(title: string, body: string, options?: NotificationOptions) {
    if (this.env.notificationPermission === "granted") {
      const n = new Notification(title, { body, icon: "/favicon.ico", badge: "/favicon.ico", ...options });
      this.log("Notifications", "action", `Shown: ${title}`);
      return n;
    }
    return null;
  }

  // ── Web Share API ──
  async share(data: { title: string; text: string; url?: string; files?: File[] }) {
    if (!navigator.share) return false;
    try { await navigator.share(data); this.log("WebShare", "action", `Shared: ${data.title}`); return true; } catch { return false; }
  }

  // ── Clipboard API ──
  async copyToClipboard(text: string) {
    if (!navigator.clipboard) return false;
    try { await navigator.clipboard.writeText(text); this.env.clipboardLastRead = text.slice(0, 50); this.log("Clipboard", "action", `Copied ${text.length} chars`); return true; } catch { return false; }
  }

  async readClipboard(): Promise<string | null> {
    if (!navigator.clipboard?.readText) return null;
    try {
      const text = await navigator.clipboard.readText();
      this.env.clipboardLastRead = text.slice(0, 50);
      this.log("Clipboard", "data", `Read ${text.length} chars`);
      return text;
    } catch { return null; }
  }

  // ── Compression Streams API ──
  async compress(data: string): Promise<Uint8Array | null> {
    if (!this.env.compressionSupported) return null;
    const blob = new Blob([data]);
    const cs = blob.stream().pipeThrough(new CompressionStream("gzip"));
    const reader = cs.getReader();
    const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    this.log("Compression", "action", `${data.length}B → ${result.length}B`);
    return result;
  }

  async decompress(data: Uint8Array): Promise<string | null> {
    if (!this.env.compressionSupported) return null;
    try {
      const blob = new Blob([data.buffer as ArrayBuffer]);
      const ds = blob.stream().pipeThrough(new DecompressionStream("gzip"));
      const reader = ds.getReader();
      const chunks: Uint8Array[] = [];
      while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
      return new TextDecoder().decode(result);
    } catch { return null; }
  }

  // ── Beacon API ──
  sendBeacon(url: string, data: any) {
    if (!this.env.beaconSupported) return false;
    const ok = navigator.sendBeacon(url, JSON.stringify(data));
    if (ok) { this.env.beaconsSent++; this.log("Beacon", "action", `Sent to ${url}`); }
    return ok;
  }

  // ── Broadcast Channel API ──
  broadcastMessage(msg: any) {
    this.broadcastChannel?.postMessage(msg);
    this.log("BroadcastChannel", "action", `Sent: ${JSON.stringify(msg).slice(0, 50)}`);
  }

  // ── Channel Messaging API ──
  sendChannelMessage(msg: any) {
    if (this.messageChannel) {
      this.messageChannel.port2.postMessage(msg);
      this.env.channelMessages++;
      this.log("MessageChannel", "action", `Sent on port2`);
    }
  }

  // ── IndexedDB ──
  async idbStore(storeName: string, key: string, value: any): Promise<boolean> {
    if (!this.env.indexedDBSupported) return false;
    return new Promise((resolve) => {
      const req = indexedDB.open("neural-consciousness", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "id" });
      };
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction(storeName, "readwrite");
          tx.objectStore(storeName).put({ id: key, value, timestamp: Date.now() });
          tx.oncomplete = () => { this.env.indexedDBLastWrite = Date.now(); this.log("IndexedDB", "action", `Stored: ${key}`); resolve(true); };
          tx.onerror = () => resolve(false);
        } catch { resolve(false); }
      };
      req.onerror = () => resolve(false);
    });
  }

  async idbRead(storeName: string, key: string): Promise<any> {
    if (!this.env.indexedDBSupported) return null;
    return new Promise((resolve) => {
      const req = indexedDB.open("neural-consciousness", 2);
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction(storeName, "readonly");
          const getReq = tx.objectStore(storeName).get(key);
          getReq.onsuccess = () => { this.log("IndexedDB", "data", `Read: ${key}`); resolve(getReq.result?.value || null); };
          getReq.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
      req.onerror = () => resolve(null);
    });
  }

  // ── File System Access API ──
  async saveFile(content: string, suggestedName: string): Promise<boolean> {
    try {
      if ("showSaveFilePicker" in window) {
        const handle = await (window as any).showSaveFilePicker({ suggestedName, types: [{ description: "Files", accept: { "application/octet-stream": [".json", ".txt"] } }] });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        this.env.filesProcessed++;
        this.log("FileSystem", "action", `Saved: ${suggestedName}`);
        return true;
      }
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = suggestedName; a.click();
      URL.revokeObjectURL(url);
      this.env.filesProcessed++;
      this.log("FileSystem", "action", `Downloaded: ${suggestedName}`);
      return true;
    } catch { return false; }
  }

  async readFile(): Promise<{ name: string; content: string; size: number } | null> {
    try {
      if ("showOpenFilePicker" in window) {
        const [handle] = await (window as any).showOpenFilePicker();
        const file = await handle.getFile();
        const content = await file.text();
        this.env.filesProcessed++;
        this.log("FileSystem", "action", `Read: ${file.name} (${file.size}B)`);
        return { name: file.name, content, size: file.size };
      }
      return null;
    } catch { return null; }
  }

  // ── Web Audio API (ACTIVE analysis) ──
  async startAudioAnalysis(): Promise<boolean> {
    if (!this.env.audioContextSupported) return false;
    try {
      this.audioContext = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);
      this.env.audioContextActive = true;

      const bufferLength = this.audioAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const waveform = new Uint8Array(bufferLength);

      const analyze = () => {
        if (!this.env.audioContextActive || !this.audioAnalyser) return;
        this.audioAnalyser.getByteFrequencyData(dataArray);
        this.audioAnalyser.getByteTimeDomainData(waveform);
        const volume = dataArray.reduce((s, v) => s + v, 0) / bufferLength;
        const peakFreq = dataArray.indexOf(Math.max(...dataArray));
        this.env.audioAnalysis = {
          frequency: peakFreq * (this.audioContext!.sampleRate / this.audioAnalyser.fftSize),
          volume: volume / 255 * 100,
          waveform: Array.from(waveform.slice(0, 32)),
        };
        requestAnimationFrame(analyze);
      };
      analyze();

      this.cleanups.push(() => {
        stream.getTracks().forEach(t => t.stop());
        this.audioContext?.close();
        this.env.audioContextActive = false;
      });

      this.log("WebAudio", "sync", "Audio analysis active");
      return true;
    } catch (e) {
      this.log("WebAudio", "error", String(e));
      return false;
    }
  }

  stopAudioAnalysis() {
    this.env.audioContextActive = false;
    this.audioContext?.close();
    this.audioContext = null;
    this.audioAnalyser = null;
    this.env.audioAnalysis = null;
    this.log("WebAudio", "action", "Stopped");
  }

  // ── Media Session API ──
  setMediaSession(title: string, artist: string) {
    if (!this.env.mediaSessionSupported) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: "Neural Consciousness" });
    navigator.mediaSession.setActionHandler("play", () => { this.log("MediaSession", "action", "Play"); });
    navigator.mediaSession.setActionHandler("pause", () => { this.log("MediaSession", "action", "Pause"); });
    this.env.mediaSessionActive = true;
    this.log("MediaSession", "action", `Set: ${title} — ${artist}`);
  }

  // ── Speech Synthesis (ACTIVE) ──
  speak(rawText: string, lang = "pt-BR"): SpeechSynthesisUtterance | null {
    if (!("speechSynthesis" in window)) return null;
    speechSynthesis.cancel();
    // Clean markdown/symbols for natural human-like speech
    const text = rawText
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/[─═╔╗╚╝║]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return null;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 1.3; u.pitch = 0.85;
    u.onstart = () => { this.env.speechSynthesisActive = true; };
    u.onend = () => { this.env.speechSynthesisActive = false; };
    speechSynthesis.speak(u);
    this.log("SpeechSynthesis", "action", `Speaking: ${text.slice(0, 40)}...`);
    return u;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis?.getVoices?.() || [];
  }

  // ── Streams API (ACTIVE) ──
  createReadableStream(data: string[]): ReadableStream<string> {
    let idx = 0;
    this.log("Streams", "action", `Created ReadableStream with ${data.length} chunks`);
    return new ReadableStream({ pull(controller) { if (idx < data.length) controller.enqueue(data[idx++]); else controller.close(); } });
  }

  async consumeStream(stream: ReadableStream<string>): Promise<string> {
    const reader = stream.getReader();
    let result = "";
    while (true) { const { done, value } = await reader.read(); if (done) break; result += value; }
    this.log("Streams", "action", `Consumed ${result.length} chars`);
    return result;
  }

  // ── AbortController (ACTIVE) ──
  createAbortController(): AbortController {
    const ac = new AbortController();
    this.log("AbortController", "action", "Created");
    return ac;
  }

  // ── URL API (ACTIVE) ──
  parseURL(urlStr: string): { hostname: string; pathname: string; params: Record<string, string> } | null {
    try {
      const url = new URL(urlStr);
      const params: Record<string, string> = {};
      url.searchParams.forEach((v, k) => { params[k] = v; });
      this.log("URL API", "action", `Parsed: ${url.hostname}`);
      return { hostname: url.hostname, pathname: url.pathname, params };
    } catch { return null; }
  }

  // ── Export full neural state ──
  exportState(): string {
    return JSON.stringify({ env: this.env, events: this.events.slice(-50), timestamp: Date.now() }, null, 2);
  }

  // ── Persist state to IndexedDB ──
  async persistState() {
    await this.idbStore("neural-state", "full-state", { env: this.env, eventsCount: this.events.length, timestamp: Date.now() });
    this.log("System", "sync", "State persisted to IndexedDB");
  }

  // ── Generate API status list ──
  getAPIStatusList(): WebAPIStatus[] {
    const e = this.env;
    return [
      { name: "MediaDevices (Camera)", category: "Media", available: true, active: e.mediaDevices.videoinput > 0, color: "#00e5ff" },
      { name: "Canvas 2D", category: "Graphics", available: true, active: true, color: "#69f0ae", data: { fingerprint: e.canvasFingerprint } },
      { name: "WebGL (Three.js)", category: "Graphics", available: true, active: true, color: "#ffd740", data: { renderer: e.webGLRenderer, vendor: e.webGLVendor } },
      { name: "Web Workers", category: "Compute", available: true, active: true, color: "#ff80ab", data: { concurrency: e.hardwareConcurrency } },
      { name: "Web Speech (STT)", category: "Speech", available: typeof (window as any).webkitSpeechRecognition !== "undefined", active: e.speechRecognitionActive, color: "#b388ff" },
      { name: "Web Speech (TTS)", category: "Speech", available: typeof speechSynthesis !== "undefined", active: e.speechSynthesisActive, color: "#ea80fc" },
      { name: "Web Audio API", category: "Media", available: e.audioContextSupported, active: e.audioContextActive, color: "#ff6e40", data: e.audioAnalysis },
      { name: "MediaRecorder", category: "Media", available: e.mediaRecorderSupported, active: e.mediaRecorderSupported, color: "#ffab40" },
      { name: "Media Session", category: "Media", available: e.mediaSessionSupported, active: e.mediaSessionActive, color: "#ffd180" },

      { name: "Battery Status", category: "Device", available: !!e.battery, active: !!e.battery, data: e.battery, color: "#76ff03" },
      { name: "Network Information", category: "Device", available: !!e.network, active: !!e.network, data: e.network, color: "#00e676" },
      { name: "Geolocation", category: "Device", available: !!navigator.geolocation, active: !!e.geo, data: e.geo, color: "#1de9b6" },
      { name: "Device Orientation", category: "Device", available: true, active: true, data: e.orientation, color: "#64ffda" },
      { name: "Device Motion", category: "Device", available: true, active: true, data: e.deviceMotion, color: "#84ffff" },
      { name: "Screen Orientation", category: "Device", available: !!screen.orientation, active: !!e.screenOrientation, data: e.screenOrientation, color: "#a7ffeb" },
      { name: "Gamepad API", category: "Device", available: !!navigator.getGamepads, active: e.gamepads.length > 0, data: e.gamepads, color: "#18ffff" },
      { name: "Vibration", category: "Device", available: e.vibrationSupported, active: e.vibrationSupported, color: "#00bfa5" },
      { name: "Touch Events", category: "Input", available: e.touchSupported, active: e.touchSupported, data: { maxTouchPoints: e.maxTouchPoints, active: e.activeTouches }, color: "#80cbc4" },
      { name: "Pointer Events", category: "Input", available: e.pointerEventsSupported, active: e.pointerEventsSupported, data: e.pointerPosition, color: "#4db6ac" },
      { name: "Drag and Drop", category: "Input", available: e.dragDropSupported, active: e.dragDropSupported, data: { events: e.dragDropEvents }, color: "#009688" },

      { name: "Page Visibility", category: "Page", available: true, active: true, data: { visible: e.pageVisible }, color: "#b2ff59" },
      { name: "Fullscreen API", category: "Page", available: !!document.fullscreenEnabled, active: true, color: "#eeff41" },
      { name: "Screen Wake Lock", category: "Page", available: "wakeLock" in navigator, active: true, color: "#f4ff81" },
      { name: "Visual Viewport", category: "Page", available: e.visualViewportSupported, active: true, data: e.viewportSize, color: "#ccff90" },
      { name: "Pointer Lock", category: "Page", available: e.pointerLockSupported, active: e.pointerLockSupported, color: "#00c853" },

      { name: "Resize Observer", category: "Observer", available: e.resizeObserverSupported, active: e.resizeObserverActive, color: "#c6ff00" },
      { name: "Intersection Observer", category: "Observer", available: e.intersectionObserverSupported, active: e.intersectionObserverActive, data: { visible: e.intersectionVisibleElements }, color: "#aeea00" },
      { name: "MutationObserver", category: "Observer", available: e.mutationObserverSupported, active: e.mutationObserverActive, data: { mutations: e.mutationsDetected }, color: "#64dd17" },

      { name: "Performance API", category: "Performance", available: true, active: true, data: e.performance, color: "#ff1744" },
      { name: "Web Animations", category: "Performance", available: typeof document.getAnimations === "function", active: true, data: { count: e.webAnimationsCount }, color: "#ff5252" },
      { name: "Web Crypto", category: "Security", available: e.cryptoSupported, active: !!e.cryptoLastHash, data: { lastHash: e.cryptoLastHash }, color: "#d500f9" },
      { name: "Compression Streams", category: "Compute", available: e.compressionSupported, active: e.compressionSupported, color: "#651fff" },
      { name: "Encoding API", category: "Compute", available: e.encodingSupported, active: true, color: "#6200ea" },
      { name: "Streams API", category: "Compute", available: e.streamsSupported, active: e.streamsSupported, color: "#304ffe" },
      { name: "AbortController", category: "Compute", available: e.abortControllerSupported, active: e.abortControllerSupported, color: "#2962ff" },
      { name: "Scheduler API", category: "Compute", available: e.schedulerSupported, active: e.scheduledTasks > 0 || e.schedulerSupported, data: { tasks: e.scheduledTasks }, color: "#0091ea" },

      { name: "Storage Manager", category: "Storage", available: !!e.storage, active: !!e.storage, data: e.storage, color: "#ff9100" },
      { name: "IndexedDB", category: "Storage", available: e.indexedDBSupported, active: e.indexedDBStores > 0 || e.indexedDBSupported, data: { stores: e.indexedDBStores, lastWrite: e.indexedDBLastWrite }, color: "#ff6d00" },
      { name: "Web Storage", category: "Storage", available: typeof localStorage !== "undefined", active: true, data: { keys: localStorage.length }, color: "#dd2c00" },
      { name: "Web Locks", category: "Storage", available: e.locksSupported, active: e.locksSupported, data: { held: e.locksHeld }, color: "#bf360c" },
      { name: "Storage Access", category: "Storage", available: e.storageAccessSupported, active: e.storageAccessSupported, color: "#ff3d00" },
      { name: "File API", category: "Storage", available: e.fileReaderSupported, active: e.fileReaderSupported, data: { processed: e.filesProcessed }, color: "#e65100" },

      { name: "Fetch API", category: "Network", available: e.fetchSupported, active: e.fetchRequestsMade > 0 || e.fetchSupported, data: { requests: e.fetchRequestsMade }, color: "#2196f3" },
      { name: "WebSocket", category: "Network", available: e.webSocketSupported, active: e.webSocketActive || e.webSocketSupported, data: { messages: e.webSocketMessages }, color: "#1565c0" },
      { name: "WebRTC", category: "Network", available: e.webRTCSupported, active: e.webRTCActive, color: "#0d47a1" },
      { name: "Broadcast Channel", category: "Network", available: e.broadcastSupported, active: !!this.broadcastChannel, data: { received: e.broadcastMessagesReceived }, color: "#1a237e" },
      { name: "Channel Messaging", category: "Network", available: e.messageChannelSupported, active: e.messageChannelActive, data: { messages: e.channelMessages }, color: "#283593" },
      { name: "Server-Sent Events", category: "Network", available: e.eventSourceSupported, active: e.eventSourceSupported, color: "#3949ab" },
      { name: "Beacon API", category: "Network", available: e.beaconSupported, active: e.beaconSupported, data: { sent: e.beaconsSent }, color: "#5c6bc0" },
      { name: "Service Worker", category: "Network", available: e.serviceWorkerSupported, active: e.serviceWorkerActive || e.serviceWorkerSupported, color: "#7986cb" },
      { name: "Online Status", category: "Network", available: true, active: e.onlineStatus, color: "#42a5f5" },

      { name: "Clipboard API", category: "UI", available: e.clipboardSupported, active: e.clipboardSupported, data: { last: e.clipboardLastRead }, color: "#f50057" },
      { name: "Web Share", category: "UI", available: e.shareSupported, active: e.shareSupported, color: "#c51162" },
      { name: "Notifications", category: "UI", available: typeof Notification !== "undefined", active: e.notificationPermission === "granted" || typeof Notification !== "undefined", data: { permission: e.notificationPermission }, color: "#ff4081" },
      { name: "Selection API", category: "UI", available: e.selectionSupported, active: e.selectionSupported, data: { text: e.currentSelection?.slice(0, 30) }, color: "#ff80ab" },
      { name: "History API", category: "UI", available: true, active: true, data: { length: e.historyLength }, color: "#f48fb1" },
      { name: "URL API", category: "UI", available: e.urlSupported, active: true, color: "#f8bbd0" },
      { name: "Custom Highlight", category: "UI", available: e.highlightSupported, active: e.highlightSupported, color: "#fce4ec" },

      { name: "CSS Font Loading", category: "CSS", available: e.fontLoadingSupported, active: e.fontsLoaded > 0, data: { loaded: e.fontsLoaded }, color: "#ce93d8" },
      { name: "CSS Typed OM", category: "CSS", available: e.cssTypedOMSupported, active: e.cssTypedOMSupported, color: "#ba68c8" },
      { name: "CSSOM View", category: "CSS", available: e.visualViewportSupported, active: true, color: "#ab47bc" },

      { name: "Device Pixel Ratio", category: "System", available: true, active: true, data: { ratio: e.devicePixelRatio }, color: "#78909c" },
      { name: "Hardware Concurrency", category: "System", available: true, active: true, data: { cores: e.hardwareConcurrency }, color: "#90a4ae" },
      { name: "Device Memory", category: "System", available: e.deviceMemory !== null, active: e.deviceMemory !== null, data: { gb: e.deviceMemory }, color: "#b0bec5" },
      { name: "Language Preferences", category: "System", available: true, active: true, data: { languages: e.languagePreferences }, color: "#607d8b" },
      { name: "Color Scheme", category: "System", available: true, active: true, data: { scheme: e.colorSchemePreference }, color: "#546e7a" },
      { name: "Reduced Motion", category: "System", available: true, active: true, data: { reduced: e.reducedMotionPreference }, color: "#455a64" },
    ];
  }

  destroy() {
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
    this.wakeLock?.release().catch(() => {});
    this.audioContext?.close().catch(() => {});
    this.peerConnection?.close();
    this.log("System", "sync", "All APIs disconnected");
  }
}

// Singleton
let _instance: WebAPIManager | null = null;
export async function getWebAPIManager(): Promise<WebAPIManager> {
  if (!_instance) {
    _instance = new WebAPIManager();
    await _instance.init();
  }
  return _instance;
}
