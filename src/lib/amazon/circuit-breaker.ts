/**
 * ─── Circuit Breaker for External API Calls ───
 * Prevents cascading failures by tracking error rates
 * and short-circuiting requests when a service is down.
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitConfig {
  failureThreshold: number;   // failures before opening
  resetTimeoutMs: number;     // how long to stay open before half-open
  halfOpenMaxAttempts: number; // attempts allowed in half-open
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt: number | null;
  openedAt: number | null;
  totalRequests: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60_000, // 1 minute
  halfOpenMaxAttempts: 2,
};

class CircuitBreaker {
  private circuits = new Map<string, {
    config: CircuitConfig;
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureAt: number | null;
    openedAt: number | null;
    halfOpenAttempts: number;
    totalRequests: number;
  }>();

  register(name: string, config?: Partial<CircuitConfig>): void {
    if (this.circuits.has(name)) return;
    this.circuits.set(name, {
      config: { ...DEFAULT_CONFIG, ...config },
      state: "CLOSED",
      failures: 0,
      successes: 0,
      lastFailureAt: null,
      openedAt: null,
      halfOpenAttempts: 0,
      totalRequests: 0,
    });
  }

  private getOrCreate(name: string): NonNullable<ReturnType<typeof this.circuits.get>> {
    if (!this.circuits.has(name)) this.register(name);
    return this.circuits.get(name)!;
  }

  /**
   * Check if a request should be allowed through.
   */
  canRequest(name: string): boolean {
    const circuit = this.getOrCreate(name);

    if (circuit.state === "CLOSED") return true;

    if (circuit.state === "OPEN") {
      // Check if enough time has passed to try half-open
      const elapsed = Date.now() - (circuit.openedAt || 0);
      if (elapsed >= circuit.config.resetTimeoutMs) {
        circuit.state = "HALF_OPEN";
        circuit.halfOpenAttempts = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN — allow limited attempts
    return circuit.halfOpenAttempts < circuit.config.halfOpenMaxAttempts;
  }

  /**
   * Record a successful request.
   */
  recordSuccess(name: string): void {
    const circuit = this.getOrCreate(name);
    circuit.totalRequests++;
    circuit.successes++;

    if (circuit.state === "HALF_OPEN") {
      // Reset to closed
      circuit.state = "CLOSED";
      circuit.failures = 0;
      circuit.openedAt = null;
      circuit.halfOpenAttempts = 0;
    }
  }

  /**
   * Record a failed request.
   */
  recordFailure(name: string): void {
    const circuit = this.getOrCreate(name);
    circuit.totalRequests++;
    circuit.failures++;
    circuit.lastFailureAt = Date.now();

    if (circuit.state === "HALF_OPEN") {
      circuit.halfOpenAttempts++;
      if (circuit.halfOpenAttempts >= circuit.config.halfOpenMaxAttempts) {
        circuit.state = "OPEN";
        circuit.openedAt = Date.now();
      }
      return;
    }

    if (circuit.failures >= circuit.config.failureThreshold) {
      circuit.state = "OPEN";
      circuit.openedAt = Date.now();
      console.warn(`[CircuitBreaker] ${name} → OPEN (${circuit.failures} failures)`);
    }
  }

  /**
   * Execute a function with circuit breaker protection.
   */
  async execute<T>(name: string, fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (!this.canRequest(name)) {
      const circuit = this.getOrCreate(name);
      const waitMs = Math.max(0, circuit.config.resetTimeoutMs - (Date.now() - (circuit.openedAt || 0)));
      console.warn(`[CircuitBreaker] ${name} is OPEN. Retry in ${Math.round(waitMs / 1000)}s`);
      if (fallback) return fallback();
      throw new Error(`Service "${name}" is temporarily unavailable (circuit open). Try again in ${Math.round(waitMs / 1000)}s.`);
    }

    try {
      const result = await fn();
      this.recordSuccess(name);
      return result;
    } catch (err) {
      this.recordFailure(name);
      throw err;
    }
  }

  getStats(name: string): CircuitStats | null {
    const circuit = this.circuits.get(name);
    if (!circuit) return null;
    return {
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      lastFailureAt: circuit.lastFailureAt,
      openedAt: circuit.openedAt,
      totalRequests: circuit.totalRequests,
    };
  }

  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    this.circuits.forEach((circuit, name) => {
      stats[name] = {
        state: circuit.state,
        failures: circuit.failures,
        successes: circuit.successes,
        lastFailureAt: circuit.lastFailureAt,
        openedAt: circuit.openedAt,
        totalRequests: circuit.totalRequests,
      };
    });
    return stats;
  }

  reset(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.state = "CLOSED";
      circuit.failures = 0;
      circuit.successes = 0;
      circuit.openedAt = null;
      circuit.halfOpenAttempts = 0;
    }
  }
}

// Singleton
export const circuitBreaker = new CircuitBreaker();

// Pre-register known services
circuitBreaker.register("amazon_api", { failureThreshold: 3, resetTimeoutMs: 30_000 });
circuitBreaker.register("mqtt_broker", { failureThreshold: 5, resetTimeoutMs: 60_000 });
circuitBreaker.register("alexa_api", { failureThreshold: 3, resetTimeoutMs: 45_000 });
