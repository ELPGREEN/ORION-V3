/**
 * Centralized Error Utility
 * Provides normalized error shapes and structured logging.
 */

export class AppError extends Error {
  public code: string;
  public context: Record<string, any>;
  public cause?: any;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    context: Record<string, any> = {},
    cause?: any
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.context = context;
    this.cause = cause;
  }
}

/**
 * Generates a simple correlation ID for log tracing.
 */
export function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
}

/**
 * Wraps a promise and logs errors in a structured format.
 */
export async function wrapAsync<T>(
  promise: Promise<T>,
  context: Record<string, any> = {}
): Promise<T> {
  const correlationId = generateCorrelationId();
  try {
    return await promise;
  } catch (error: any) {
    const normalizedError = error instanceof AppError
      ? error
      : new AppError(error.message || "Unexpected error", "ASYNC_ERROR", context, error);

    console.error(`[Error][${correlationId}]`, {
      code: normalizedError.code,
      message: normalizedError.message,
      context: { ...normalizedError.context, correlationId },
      cause: normalizedError.cause,
      stack: normalizedError.stack,
    });

    throw normalizedError;
  }
}

/**
 * Specifically handles Supabase client calls (RPC or Query).
 */
export async function wrapSupabase<T>(
  promise: PromiseLike<{ data: T | null; error: any; count?: number | null }>,
  context: Record<string, any> = {}
): Promise<{ data: T | null; count: number | null }> {
  const correlationId = generateCorrelationId();
  const { data, error, count } = await promise;

  if (error) {
    console.error(`[SupabaseError][${correlationId}]`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      context: { ...context, correlationId },
    });
    throw new AppError(error.message, error.code || "SUPABASE_ERROR", {
      ...context,
      details: error.details,
      hint: error.hint,
      correlationId,
    });
  }

  return { data, count: count ?? null };
}

/**
 * Specifically handles Supabase Edge Function invocations.
 */
export async function wrapEdgeFunction<T>(
  promise: PromiseLike<{ data: T | null; error: any }>,
  functionName: string,
  context: Record<string, any> = {}
): Promise<T | null> {
  const correlationId = generateCorrelationId();
  const { data, error } = await promise;

  if (error) {
    console.error(`[EdgeFunctionError][${correlationId}][${functionName}]`, {
      message: error.message,
      context: { ...context, correlationId },
    });
    throw new AppError(`Edge Function ${functionName} failed: ${error.message}`, "EDGE_FUNCTION_ERROR", {
      ...context,
      functionName,
      correlationId,
    });
  }

  return data;
}
