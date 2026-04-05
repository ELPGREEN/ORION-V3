/**
 * Circuit Breaker for Edge Functions
 * Prevents cascading failures by tracking consecutive errors per service.
 * States: CLOSED (ok) → OPEN (blocking) → HALF_OPEN (testing)
 */

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half_open";
}

const circuits = new Map<string, CircuitState>();
const MAX_FAILURES = 3;
const OPEN_DURATION_MS = 30_000; // 30s

function getCircuit(name: string): CircuitState {
  if (!circuits.has(name)) {
    circuits.set(name, { failures: 0, lastFailure: 0, state: "closed" });
  }
  return circuits.get(name)!;
}

export function isCircuitOpen(name: string): boolean {
  const circuit = getCircuit(name);
  if (circuit.state === "closed") return false;
  if (circuit.state === "open" && Date.now() - circuit.lastFailure > OPEN_DURATION_MS) {
    circuit.state = "half_open";
    return false; // Allow one test request
  }
  return circuit.state === "open";
}

export function recordSuccess(name: string): void {
  const circuit = getCircuit(name);
  circuit.failures = 0;
  circuit.state = "closed";
}

export function recordFailure(name: string): void {
  const circuit = getCircuit(name);
  circuit.failures += 1;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= MAX_FAILURES) {
    circuit.state = "open";
    console.warn(`[CircuitBreaker] ${name} OPEN after ${circuit.failures} consecutive failures. Blocking for ${OPEN_DURATION_MS / 1000}s.`);
  }
}

export function getCircuitState(name: string): CircuitState["state"] {
  return getCircuit(name).state;
}

/**
 * Wraps an async function with circuit breaker + retry logic.
 * @param name - Service identifier
 * @param fn - The async function to call
 * @param retries - Number of retries (default 1)
 * @param backoffMs - Initial backoff in ms (default 500)
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  retries = 1,
  backoffMs = 500,
): Promise<T> {
  if (isCircuitOpen(name)) {
    throw new Error(`[CircuitBreaker] ${name} is OPEN — service temporarily unavailable`);
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      recordSuccess(name);
      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`[CircuitBreaker] ${name} attempt ${attempt + 1}/${retries + 1} failed:`, err?.message || err);

      if (attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  recordFailure(name);
  throw lastError!;
}
