import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export async function validateBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<{ data?: T; error?: Response }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        error: new Response(
          JSON.stringify({ error: "Validation failed", details: err.errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      };
    }
    return {
      error: new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }
}
