
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Free API endpoints ──
const APIS = {
  // News
  GOOGLE_NEWS_RSS: "https://news.google.com/rss/search",
  WIKIPEDIA_EVENTS: "https://en.wikipedia.org/w/api.php",

  // Market - Brazil
  BCB_PTAX: "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata",
  BCB_SELIC: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json",
  BCB_IPCA: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json",
  COINGECKO: "https://api.coingecko.com/api/v3",
  EXCHANGERATE: "https://open.er-api.com/v6/latest",

  // Weather
  OPEN_METEO: "https://api.open-meteo.com/v1/forecast",
  GEOCODING: "https://geocoding-api.open-meteo.com/v1/search",

  // Legal - Brazil
  DATAJUD: "https://api-publica.datajud.cnj.jus.br/api_publica_",
  CAMARA: "https://dadosabertos.camara.leg.br/api/v2",
  SENADO: "https://legis.senado.leg.br/dadosabertos",
};

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── NEWS ──
async function searchNews(query: string, lang = "pt-BR", limit = 10) {
  const results: Array<{ title: string; link: string; source: string; published: string }> = [];

  // Google News RSS
  try {
    const url = `${APIS.GOOGLE_NEWS_RSS}?q=${encodeURIComponent(query)}&hl=${lang}&gl=BR&ceid=BR:pt-419`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    for (const item of items.slice(0, limit)) {
      const title = item.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, "$1") || "";
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || item.match(/<link\/>(.*?)(?=<)/)?.[1] || "";
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const source = item.match(/<source.*?>(.*?)<\/source>/)?.[1] || "Google News";
      results.push({ title, link: link.trim(), source, published: pubDate });
    }
  } catch (e) {
    console.error("Google News RSS error:", e);
  }

  // Firecrawl search fallback
  if (results.length < 3) {
    try {
      const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (apiKey) {
        const res = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: `${query} últimas notícias`, limit: 5 }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (data.success && data.data) {
          for (const r of data.data) {
            results.push({
              title: r.title || r.url,
              link: r.url,
              source: "Firecrawl",
              published: new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.error("Firecrawl fallback error:", e);
    }
  }

  return { success: true, query, results: results.slice(0, limit), fetched_at: new Date().toISOString() };
}

// ── MARKET DATA ──
async function getMarketData(tickers?: string[]) {
  const data: Record<string, unknown> = {};

  // USD/BRL (PTAX)
  try {
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}-${today.getFullYear()}`;
    const url = `${APIS.BCB_PTAX}/CotacaoDolarDia(dataCotacao=@d)?@d='${dateStr}'&$format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    data.usd_brl = json.value?.[0] || null;
  } catch (e) {
    console.error("PTAX error:", e);
  }

  // SELIC
  try {
    const res = await fetch(APIS.BCB_SELIC, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    data.selic = json[0] || null;
  } catch (e) {
    console.error("SELIC error:", e);
  }

  // IPCA
  try {
    const res = await fetch(APIS.BCB_IPCA, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    data.ipca = json[0] || null;
  } catch (e) {
    console.error("IPCA error:", e);
  }

  // Crypto (if tickers include crypto)
  const cryptoTickers = (tickers || ["bitcoin", "ethereum"]).filter((t) =>
    ["bitcoin", "ethereum", "solana", "bnb", "cardano", "xrp", "dogecoin"].includes(t.toLowerCase())
  );
  if (cryptoTickers.length > 0) {
    try {
      const ids = cryptoTickers.join(",");
      const res = await fetch(
        `${APIS.COINGECKO}/simple/price?ids=${ids}&vs_currencies=usd,brl&include_24hr_change=true`,
        { signal: AbortSignal.timeout(5000) }
      );
      data.crypto = await res.json();
    } catch (e) {
      console.error("CoinGecko error:", e);
    }
  }

  // Exchange rates
  try {
    const res = await fetch(`${APIS.EXCHANGERATE}/BRL`, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    data.exchange_rates = {
      base: "BRL",
      usd: json.rates?.USD,
      eur: json.rates?.EUR,
      gbp: json.rates?.GBP,
      updated: json.time_last_update_utc,
    };
  } catch (e) {
    console.error("Exchange rate error:", e);
  }

  return { success: true, market: data, fetched_at: new Date().toISOString() };
}

// ── WEATHER ──
async function getWeather(lat?: number, lon?: number, city?: string) {
  let latitude = lat || -23.5505;
  let longitude = lon || -46.6333;
  let location_name = city || "São Paulo";

  // Geocode city if provided
  if (city && !lat) {
    try {
      const res = await fetch(
        `${APIS.GEOCODING}?name=${encodeURIComponent(city)}&count=1&language=pt`,
        { signal: AbortSignal.timeout(5000) }
      );
      const geo = await res.json();
      if (geo.results?.[0]) {
        latitude = geo.results[0].latitude;
        longitude = geo.results[0].longitude;
        location_name = geo.results[0].name + ", " + (geo.results[0].admin1 || geo.results[0].country);
      }
    } catch (e) {
      console.error("Geocoding error:", e);
    }
  }

  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,sunrise,sunset",
      timezone: "America/Sao_Paulo",
      forecast_days: "5",
    });
    const res = await fetch(`${APIS.OPEN_METEO}?${params}`, { signal: AbortSignal.timeout(8000) });
    const weather = await res.json();

    return {
      success: true,
      location: location_name,
      coordinates: { lat: latitude, lon: longitude },
      current: weather.current,
      daily: weather.daily,
      fetched_at: new Date().toISOString(),
    };
  } catch (e) {
    console.error("Weather error:", e);
    return { success: false, error: "Falha ao obter dados meteorológicos" };
  }
}

// ── LEGAL LIVE ──
async function getLegalData(query?: string, processo_numero?: string) {
  const results: Record<string, unknown> = {};

  // Proposições legislativas (Câmara)
  if (query) {
    try {
      const params = new URLSearchParams({
        palavrasChave: query,
        ordem: "DESC",
        ordenarPor: "id",
        itens: "10",
      });
      const res = await fetch(`${APIS.CAMARA}/proposicoes?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      results.proposicoes_camara = json.dados?.slice(0, 5) || [];
    } catch (e) {
      console.error("Câmara API error:", e);
    }
  }

  // Votações recentes (Câmara)
  try {
    const params = new URLSearchParams({ ordem: "DESC", ordenarPor: "dataHoraRegistro", itens: "5" });
    const res = await fetch(`${APIS.CAMARA}/votacoes?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    results.votacoes_recentes = json.dados?.slice(0, 5) || [];
  } catch (e) {
    console.error("Votações error:", e);
  }

  // DataJud - busca por número do processo
  if (processo_numero) {
    try {
      const cleaned = processo_numero.replace(/[^\d]/g, "");
      // Tribunal based on process number segments
      const tribunal = cleaned.length >= 13 ? cleaned.substring(7, 11) : "tjsp";
      const endpoint = `${APIS.DATAJUD}${tribunal}/_search`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `APIKey ${Deno.env.get("CGU_API_KEY") || ""}`,
        },
        body: JSON.stringify({
          query: { match: { numeroProcesso: cleaned } },
          size: 5,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        results.datajud = json.hits?.hits?.map((h: any) => h._source) || [];
      }
    } catch (e) {
      console.error("DataJud error:", e);
    }
  }

  return { success: true, legal: results, fetched_at: new Date().toISOString() };
}

// ── FULL BRIEFING ──
async function getFullBriefing(query?: string, lat?: number, lon?: number, city?: string) {
  const [news, market, weather, legal] = await Promise.all([
    searchNews(query || "Brasil hoje", "pt-BR", 5),
    getMarketData(),
    getWeather(lat, lon, city),
    getLegalData(query),
  ]);

  return {
    success: true,
    briefing: {
      timestamp: new Date().toISOString(),
      news: news.results?.slice(0, 5),
      market: market.market,
      weather: { location: weather.location, current: weather.current },
      legal: legal.legal,
    },
  };
}

// ── MONITOR CHECK (for cron) ──
async function checkMonitors() {
  const sb = supabaseAdmin();
  const { data: monitors } = await sb
    .from("orion_realtime_monitors")
    .select("*")
    .eq("is_active", true);

  if (!monitors?.length) return { success: true, checked: 0 };

  let alertsCreated = 0;
  const now = new Date();

  for (const mon of monitors) {
    const lastCheck = mon.last_checked_at ? new Date(mon.last_checked_at) : new Date(0);
    const minutesSince = (now.getTime() - lastCheck.getTime()) / 60000;
    if (minutesSince < mon.check_interval_minutes) continue;

    let result: any = null;
    let alertTitle = "";
    let alertContent = "";

    try {
      const filters = mon.filters || {};
      switch (mon.monitor_type) {
        case "news":
          result = await searchNews(filters.keywords || "Brasil", "pt-BR", 3);
          if (result.results?.length) {
            alertTitle = `📰 ${result.results[0].title}`;
            alertContent = result.results.map((r: any) => `• ${r.title}`).join("\n");
          }
          break;
        case "market":
          result = await getMarketData(filters.tickers);
          alertTitle = "📊 Atualização de Mercado";
          const m = result.market;
          alertContent = [
            m.usd_brl ? `USD/BRL: R$${m.usd_brl.cotacaoCompra?.toFixed(4)}` : null,
            m.selic ? `SELIC: ${m.selic.valor}%` : null,
          ].filter(Boolean).join(" | ");
          break;
        case "legal":
          result = await getLegalData(filters.keywords, filters.processo_numero);
          if (Object.values(result.legal || {}).some((v: any) => v?.length > 0)) {
            alertTitle = "⚖️ Atualização Jurídica";
            alertContent = JSON.stringify(result.legal).substring(0, 500);
          }
          break;
        case "weather":
          result = await getWeather(filters.lat, filters.lon, filters.city);
          alertTitle = `🌤️ Clima em ${result.location}`;
          alertContent = result.current
            ? `${result.current.temperature_2m}°C, Vento ${result.current.wind_speed_10m}km/h`
            : "Dados indisponíveis";
          break;
      }
    } catch (e) {
      console.error(`Monitor ${mon.id} error:`, e);
    }

    // Update last check
    await sb.from("orion_realtime_monitors").update({
      last_checked_at: now.toISOString(),
      last_result: result,
    }).eq("id", mon.id);

    // Create alert if content
    if (alertTitle) {
      await sb.from("orion_realtime_alerts").insert({
        user_id: mon.user_id,
        monitor_id: mon.id,
        alert_type: mon.monitor_type,
        title: alertTitle,
        content: alertContent,
        data: result,
      });
      alertsCreated++;
    }
  }

  return { success: true, checked: monitors.length, alerts_created: alertsCreated };
}

// ── MAIN HANDLER ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    let result: unknown;

    switch (action) {
      case "news_search":
        result = await searchNews(params.query || "Brasil", params.lang, params.limit);
        break;
      case "market_data":
        result = await getMarketData(params.tickers);
        break;
      case "weather":
        result = await getWeather(params.lat, params.lon, params.city);
        break;
      case "legal_live":
        result = await getLegalData(params.query, params.processo_numero);
        break;
      case "full_briefing":
        result = await getFullBriefing(params.query, params.lat, params.lon, params.city);
        break;
      case "check_monitors":
        result = await checkMonitors();
        break;
      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Realtime intel error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
