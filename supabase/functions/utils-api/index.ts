import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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


    const { action, params } = await req.json();

    let data: unknown;

    switch (action) {
      // ── CNPJ (BrasilAPI) ──────────────────────────────
      case "cnpj": {
        const cnpj = String(params.cnpj).replace(/\D/g, "");
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!res.ok) throw new Error(`BrasilAPI CNPJ: ${res.status}`);
        data = await res.json();
        break;
      }

      // ── CEP (ViaCEP) ─────────────────────────────────
      case "cep": {
        const cep = String(params.cep).replace(/\D/g, "");
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!res.ok) throw new Error(`ViaCEP: ${res.status}`);
        data = await res.json();
        if ((data as any).erro) throw new Error("CEP não encontrado");
        break;
      }

      // ── Feriados (Nager.Date + BrasilAPI) ─────────────
      case "feriados": {
        const year = params.year || new Date().getFullYear();
        const [nagerRes, brRes] = await Promise.allSettled([
          fetch(`https://date.nager.at/api/v3/publicholidays/${year}/BR`),
          fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
        ]);

        const holidays: { date: string; name: string; source: string }[] = [];

        if (nagerRes.status === "fulfilled" && nagerRes.value.ok) {
          const arr = await nagerRes.value.json();
          for (const h of arr) holidays.push({ date: h.date, name: h.localName || h.name, source: "nager" });
        }

        if (brRes.status === "fulfilled" && brRes.value.ok) {
          const arr = await brRes.value.json();
          for (const h of arr) {
            if (!holidays.some((x) => x.date === h.date)) {
              holidays.push({ date: h.date, name: h.name, source: "brasilapi" });
            }
          }
        }

        holidays.sort((a, b) => a.date.localeCompare(b.date));
        data = holidays;
        break;
      }

      // ── Câmbio (AwesomeAPI + Frankfurter fallback) ────
      case "cambio": {
        const from = params.from || "USD";
        const to = params.to || "BRL";
        const date = params.date; // optional YYYY-MM-DD

        if (date) {
          const res = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`);
          if (!res.ok) throw new Error(`Frankfurter: ${res.status}`);
          data = await res.json();
        } else {
          // Try AwesomeAPI first, fallback to Frankfurter
          const pair = `${from}-${to}`;
          const res = await fetch(`https://economia.awesomeapi.com.br/last/${pair}`);
          if (res.ok) {
            const json = await res.json();
            const key = Object.keys(json)[0];
            data = json[key];
          } else {
            // Fallback to Frankfurter
            const fbRes = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
            if (!fbRes.ok) throw new Error(`Câmbio indisponível (ambas APIs falharam)`);
            const fbJson = await fbRes.json();
            data = { name: `${from}/${to}`, bid: fbJson.rates?.[to], high: fbJson.rates?.[to], low: fbJson.rates?.[to], source: "frankfurter" };
          }
        }
        break;
      }

      // ── Dicionário (Free Dictionary API) ──────────────
      case "dicionario": {
        const word = encodeURIComponent(params.word);
        const lang = params.lang || "pt";
        // Try Portuguese first, fallback to English
        let res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${lang}/${word}`);
        if (!res.ok && lang === "pt") {
          res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        }
        if (!res.ok) {
          data = { word: params.word, error: true, message: "Palavra não encontrada no dicionário" };
        } else {
          data = await res.json();
        }
        break;
      }

      // ── IBGE Localidades ──────────────────────────────
      case "ibge_localidades": {
        const uf = params.uf; // optional
        const url = uf
          ? `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
          : `https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`IBGE: ${res.status}`);
        data = await res.json();
        break;
      }

      // ── IBGE CNAE ─────────────────────────────────────
      case "ibge_cnae": {
        const id = params.id || "";
        const url = id
          ? `https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/${id}`
          : `https://servicodados.ibge.gov.br/api/v2/cnae/secoes`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`IBGE CNAE: ${res.status}`);
        data = await res.json();
        break;
      }

      // ── Bancos (BrasilAPI) ────────────────────────────
      case "bancos": {
        const res = await fetch("https://brasilapi.com.br/api/banks/v1");
        if (!res.ok) throw new Error(`BrasilAPI Bancos: ${res.status}`);
        data = await res.json();
        break;
      }

      // ── Calcular Prazo Processual ─────────────────────
      case "calcular_prazo": {
        const startDate = new Date(params.data_inicio);
        const dias = Number(params.dias_uteis);
        const year = startDate.getFullYear();

        // Fetch holidays for current and next year
        const [h1, h2] = await Promise.all([
          fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`).then((r) => r.ok ? r.json() : []),
          fetch(`https://brasilapi.com.br/api/feriados/v1/${year + 1}`).then((r) => r.ok ? r.json() : [])
        ]);
        const holidaySet = new Set([...h1, ...h2].map((h: any) => h.date));

        let count = 0;
        const current = new Date(startDate);
        const skipped: string[] = [];

        while (count < dias) {
          current.setDate(current.getDate() + 1);
          const dow = current.getDay();
          const iso = current.toISOString().slice(0, 10);

          if (dow === 0 || dow === 6) {
            skipped.push(`${iso} (fim de semana)`);
            continue;
          }
          if (holidaySet.has(iso)) {
            skipped.push(`${iso} (feriado)`);
            continue;
          }
          count++;
        }

        data = {
          data_inicio: params.data_inicio,
          dias_uteis: dias,
          data_final: current.toISOString().slice(0, 10),
          dias_corridos: Math.round((current.getTime() - startDate.getTime()) / 86400000),
          dias_pulados: skipped.length,
          detalhes: skipped,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("utils-api error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
