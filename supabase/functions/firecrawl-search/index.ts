const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // FIX: A1 — Validate user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user: _authUser }, error: _authErr } = await _sb.auth.getUser(authHeader.replace("Bearer ", ""));
      if (_authErr || !_authUser) {
        return new Response(
          JSON.stringify({ error: "Não autorizado." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }


    const { query, options } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Enable it in Settings > Connectors.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Firecrawl search:', query);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: options?.limit || 10,
        lang: options?.lang || 'pt-br',
        country: options?.country || 'br',
        tbs: options?.tbs,
        scrapeOptions: options?.scrapeOptions || { formats: ['markdown'] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform Firecrawl response to match our expected format
    const results = (data.data || []).map((item: any) => ({
      url: item.url,
      title: item.title || item.metadata?.title || '',
      description: item.description || item.metadata?.description || '',
      markdown: item.markdown || '',
    }));

    // Build a summary content from results for chat consumption
    const content = results.length > 0
      ? results.map((r: any, i: number) => `**${i + 1}. ${r.title}**\n${r.description || r.markdown?.slice(0, 300) || ''}\n🔗 ${r.url || ''}`).join('\n\n')
      : 'Nenhum resultado encontrado.';

    const citations = results.map((r: any) => r.url).filter(Boolean);

    return new Response(
      JSON.stringify({
        success: true,
        content,
        citations,
        results,
        model: 'firecrawl-search',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in firecrawl-search:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
