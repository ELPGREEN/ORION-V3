/**
 * ─── Orion Memory System ───
 * Persistent memory across sessions
 * Stores user preferences, conversation history, and context
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, userId, key, value, memoryType, limit } = await req.json();

    switch (action) {
      case "save": {
        // Save a memory (key-value or conversation)
        if (!userId || !key || value === undefined) {
          return json({ error: "Missing userId, key, or value" }, 400);
        }
        
        const { error } = await supabase.from("orion_memory").upsert({
          user_id: userId,
          memory_key: key,
          memory_type: memoryType || "preference",
          content: typeof value === "string" ? value : JSON.stringify(value),
          created_at: new Date().toISOString(),
        }, { onConflict: "user_id,memory_key" });

        if (error) throw error;
        return json({ success: true, message: `Memory '${key}' saved` });
      }

      case "load": {
        // Load memories for a user
        if (!userId) return json({ error: "Missing userId" }, 400);
        
        let query = supabase.from("orion_memory").select("*").eq("user_id", userId);
        
        if (key) {
          query = query.eq("memory_key", key);
        }
        if (memoryType) {
          query = query.eq("memory_type", memoryType);
        }
        
        const { data, error } = await query.order("created_at", { ascending: false }).limit(limit || 50);
        if (error) throw error;
        
        return json({ 
          success: true, 
          memories: data?.map(m => ({
            key: m.memory_key,
            type: m.memory_type,
            content: m.content,
            createdAt: m.created_at
          })) || []
        });
      }

      case "delete": {
        // Delete a specific memory
        if (!userId || !key) return json({ error: "Missing userId or key" }, 400);
        
        const { error } = await supabase
          .from("orion_memory")
          .delete()
          .eq("user_id", userId)
          .eq("memory_key", key);
        
        if (error) throw error;
        return json({ success: true, message: `Memory '${key}' deleted` });
      }

      case "clear": {
        // Clear all memories for a user
        if (!userId) return json({ error: "Missing userId" }, 400);
        
        const { error } = await supabase
          .from("orion_memory")
          .delete()
          .eq("user_id", userId);
        
        if (error) throw error;
        return json({ success: true, message: "All memories cleared" });
      }

      case "search": {
        // Search memories by content
        if (!userId || !key) return json({ error: "Missing userId or key" }, 400);
        
        const { data, error } = await supabase
          .from("orion_memory")
          .select("*")
          .eq("user_id", userId)
          .ilike("memory_key", `%${key}%`)
          .limit(limit || 20);
        
        if (error) throw error;
        return json({ success: true, memories: data });
      }

      default:
        return json({ error: "Invalid action. Use: save, load, delete, clear, search" }, 400);
    }
  } catch (e: any) {
    console.error("Memory error:", e);
    return json({ error: e.message }, 500);
  }
});