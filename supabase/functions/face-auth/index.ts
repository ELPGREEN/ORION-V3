import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * face-auth — Facial authentication and enrollment
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from JWT
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, images, lgpdConsent, descriptors } = body;

    if (action === "check") {
      const { data, error } = await supabaseClient
        .from("face_auth_enrollments")
        .select("id, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify({
        enrolled: !!data,
        lastUpdated: data?.updated_at,
        message: data ? "Enrollment found" : "No enrollment found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enroll") {
      if (!lgpdConsent) {
        return new Response(JSON.stringify({ error: "LGPD consent required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseClient
        .from("face_auth_enrollments")
        .upsert({
          user_id: user.id,
          face_embedding_data: { descriptors: descriptors || [] },
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Enrollment successful", id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await supabaseClient
        .from("face_auth_enrollments")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Enrollment deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[FaceAuth] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
