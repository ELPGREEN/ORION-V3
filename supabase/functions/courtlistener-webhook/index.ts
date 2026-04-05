import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EVENT_TYPES: Record<number, string> = {
  1: 'DOCKET_ALERT',
  2: 'SEARCH_ALERT',
  3: 'RECAP_FETCH',
  4: 'OLD_DOCKET_ALERT',
  5: 'BIG_CASES_ALERT',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate webhook secret if configured
    const webhookSecret = Deno.env.get('COURTLISTENER_WEBHOOK_SECRET');
    if (webhookSecret) {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (token !== webhookSecret) {
        console.error('Invalid webhook secret');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload = await req.json();
    console.log('CourtListener webhook received:', JSON.stringify(payload).substring(0, 500));

    const eventType = payload?.webhook?.event_type ?? payload?.event_type ?? 0;
    const eventTypeLabel = EVENT_TYPES[eventType] || `UNKNOWN_${eventType}`;

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the webhook event
    const { error: insertError } = await supabase
      .from('courtlistener_webhook_events')
      .insert({
        event_type: eventType,
        event_type_label: eventTypeLabel,
        payload,
        processed: false,
      });

    if (insertError) {
      console.error('Error storing webhook event:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a notification only for the advogado who owns the related case
    // Extract docket/case number from payload to match with processos
    const docketNumber = payload?.payload?.results?.[0]?.docket
      || payload?.payload?.docket
      || null;

    let targetAdvogadoIds: string[] = [];

    if (docketNumber) {
      // Try to find which advogado owns the processo linked to this docket
      const { data: processos } = await supabase
        .from('processos')
        .select('user_id')
        .ilike('numero_processo', `%${docketNumber}%`);

      if (processos && processos.length > 0) {
        targetAdvogadoIds = [...new Set(processos.map((p: any) => p.user_id))];
      }
    }

    // Fallback: if no specific advogado found, notify all advogados with processos
    if (targetAdvogadoIds.length === 0) {
      const { data: advogados } = await supabase
        .from('processos')
        .select('user_id')
        .limit(10);
      if (advogados && advogados.length > 0) {
        targetAdvogadoIds = [...new Set(advogados.map((p: any) => p.user_id))];
      }
    }

    if (targetAdvogadoIds.length > 0) {
      const title = eventTypeLabel === 'DOCKET_ALERT'
        ? 'Alerta de Docket - CourtListener'
        : eventTypeLabel === 'SEARCH_ALERT'
        ? 'Alerta de Pesquisa - CourtListener'
        : `Webhook CourtListener: ${eventTypeLabel}`;

      const description = payload?.webhook?.event_type === 1
        ? `Atualização em docket: ${docketNumber || 'N/A'}`
        : `Evento ${eventTypeLabel} recebido do CourtListener.`;

      const notifications = targetAdvogadoIds.map((advId: string) => ({
        user_id: advId,
        titulo: title,
        descricao: description,
        tipo: 'webhook',
        link: '/dashboard/webhooks',
      }));

      await supabase.from('notificacoes').insert(notifications);
    }

    return new Response(
      JSON.stringify({ status: 'ok', event_type: eventTypeLabel }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar webhook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
