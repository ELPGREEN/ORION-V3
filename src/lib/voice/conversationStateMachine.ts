/**
 * ─── Conversation State Machine ───
 * Vocode-inspired explicit states with validated transitions.
 * Prevents state drift and enables filler audio timing.
 */

export type ConversationState = "idle" | "listening" | "thinking" | "speaking";

type TransitionMap = Record<ConversationState, ConversationState[]>;

const VALID_TRANSITIONS: TransitionMap = {
  idle:      ["listening"],
  listening: ["thinking", "idle", "speaking"],
  thinking:  ["speaking", "idle", "listening"],
  speaking:  ["listening", "idle", "thinking"],
};

export type StateChangeListener = (from: ConversationState, to: ConversationState) => void;

class ConversationStateMachine {
  private _state: ConversationState = "idle";
  private _listeners: StateChangeListener[] = [];
  private _stateEnteredAt: number = Date.now();

  get state() { return this._state; }
  get stateAge() { return Date.now() - this._stateEnteredAt; }

  canTransition(to: ConversationState): boolean {
    if (this._state === to) return true;
    return VALID_TRANSITIONS[this._state].includes(to);
  }

  transition(to: ConversationState): boolean {
    if (this._state === to) return true;
    if (!this.canTransition(to)) {
      console.warn(`[CSM] ❌ Invalid transition: ${this._state} → ${to}`);
      return false;
    }
    const from = this._state;
    this._state = to;
    this._stateEnteredAt = Date.now();
    console.log(`[CSM] ${from} → ${to}`);
    this._listeners.forEach(fn => fn(from, to));
    return true;
  }

  /** Force state (for error recovery only) */
  forceState(to: ConversationState) {
    const from = this._state;
    this._state = to;
    this._stateEnteredAt = Date.now();
    console.warn(`[CSM] ⚠️ Force: ${from} → ${to}`);
    this._listeners.forEach(fn => fn(from, to));
  }

  onStateChange(fn: StateChangeListener) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  reset() {
    this.forceState("idle");
  }
}

// Singleton
let _instance: ConversationStateMachine | null = null;

export function getConversationCSM(): ConversationStateMachine {
  if (!_instance) _instance = new ConversationStateMachine();
  return _instance;
}
