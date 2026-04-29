/**
 * Orion Extension — Command Mirror
 * Syncs commands and state between main app and extension via BroadcastChannel.
 */

const CHANNEL_NAME = "neural-consciousness";
let _channel = null;
let _commandCache = new Map();
let _stateListeners = new Set();

/**
 * Initialize the mirror bridge — connects to main app's BroadcastChannel
 */
export function initMirror() {
  if (_channel) return;

  try {
    _channel = new BroadcastChannel(CHANNEL_NAME);
    _channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg?.type) return;

      switch (msg.type) {
        case "command:execute":
          handleAppCommand(msg);
          break;
        case "state:update":
          broadcastState(msg.state);
          break;
        case "voice:transcription":
          broadcastTranscription(msg.text, msg.isFinal);
          break;
        case "config:push":
          chrome.runtime.sendMessage({
            type: "ORION_PUSH_CONFIG",
            supabaseUrl: msg.supabaseUrl,
            supabaseAnonKey: msg.supabaseAnonKey,
          });
          break;
      }
    };
  } catch {
    // BroadcastChannel not supported — graceful degradation
  }
}

/**
 * Handle commands forwarded from main app
 */
function handleAppCommand(msg) {
  const { action, payload } = msg;
  if (!action) return;

  // Cache for dedup
  const key = `${action}-${JSON.stringify(payload)}`;
  if (_commandCache.has(key)) return;
  _commandCache.set(key, Date.now());
  setTimeout(() => _commandCache.delete(key), 5000);

  // Notify all tabs with content scripts
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: "ORION_APP_COMMAND",
          action,
          payload,
        });
      } catch {
        // Tab may not have content script injected
      }
    });
  });
}

/**
 * Broadcast state update to all listeners
 */
function broadcastState(state) {
  _stateListeners.forEach((fn) => fn(state));
}

/**
 * Broadcast transcription to content scripts
 */
function broadcastTranscription(text, isFinal) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    tabs.forEach((tab) => {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: "ORION_VOICE_TRANSCRIPTION",
          transcription: text,
          isFinal,
        });
      } catch {}
    });
  });
}

/**
 * Subscribe to state updates from main app
 */
export function onStateUpdate(listener) {
  _stateListeners.add(listener);
  return () => _stateListeners.delete(listener);
}

/**
 * Send command from extension to main app
 */
export function sendToApp(type, payload = {}) {
  if (!_channel) {
    initMirror();
    if (!_channel) return;
  }
  try {
    _channel.postMessage({ type, ...payload, source: "extension" });
  } catch {}
}

/**
 * Cleanup
 */
export function destroyMirror() {
  if (_channel) {
    _channel.close();
    _channel = null;
  }
  _stateListeners.clear();
  _commandCache.clear();
}
