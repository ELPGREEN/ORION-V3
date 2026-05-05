// Global type shim for Supabase Edge Runtime APIs.
// Lets edge functions reference `EdgeRuntime.waitUntil(...)` without TS2304
// in environments where the runtime global isn't declared.
declare global {
   
  var EdgeRuntime: {
    waitUntil(promise: Promise<unknown>): void;
  } | undefined;
}

export {};
