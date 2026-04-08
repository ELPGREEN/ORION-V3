import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, action } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!secret) {
      console.error("RECAPTCHA_SECRET_KEY not set");
      return new Response(JSON.stringify({ success: true, score: 1.0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const resp = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    });

    const data = await resp.json();
    const success = data.success && data.score >= 0.5 && (!action || data.action === action);

    return new Response(JSON.stringify({
      success,
      score: data.score,
      action: data.action,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("reCAPTCHA verification error:", err);
    return new Response(JSON.stringify({ success: false, error: "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
