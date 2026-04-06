/**
 * Adaptive Voice Style Engine
 * 
 * Detects voice style commands from user speech and evolves
 * the Gemini TTS style prompt over time. Persists preferences
 * per user in Supabase.
 * 
 * Commands: "fale mais devagar", "use sotaque carioca", "sussurre",
 * "tom formal", "fale rápido", "voz mais grave", etc.
 */

import { supabase } from "@/integrations/supabase/client";

// ═══ Types ═══

export interface VoiceStylePrefs {
  style_prompt: string;
  voice_name: string;
  speech_rate: string;
  accent: string;
  tone: string;
  extra_instructions: string[];
}

const DEFAULT_PREFS: VoiceStylePrefs = {
  style_prompt: "Fale de forma natural, clara e fluida em português brasileiro. Use um tom profissional mas amigável.",
  voice_name: "Charon",
  speech_rate: "normal",
  accent: "neutro",
  tone: "profissional",
  extra_instructions: [],
};

// ═══ In-memory cache ═══

let cachedPrefs: VoiceStylePrefs | null = null;
let cachedUserId: string | null = null;

// ═══ Style Command Patterns ═══

interface StyleCommand {
  patterns: RegExp[];
  apply: (prefs: VoiceStylePrefs, match?: RegExpMatchArray | null) => Partial<VoiceStylePrefs>;
  feedback: string;
}

const STYLE_COMMANDS: StyleCommand[] = [
  // Speech rate
  {
    patterns: [
      /fal[ea]\s+(mais\s+)?devagar/i,
      /mais\s+lento/i,
      /diminui[ra]?\s+(a\s+)?velocidade/i,
      /slow(er)?\s*down/i,
    ],
    apply: () => ({ speech_rate: "lento" }),
    feedback: "Vou falar mais devagar agora.",
  },
  {
    patterns: [
      /fal[ea]\s+(mais\s+)?r[aá]pido/i,
      /mais\s+r[aá]pido/i,
      /aument[ae]\s+(a\s+)?velocidade/i,
      /speed\s*up/i,
    ],
    apply: () => ({ speech_rate: "rápido" }),
    feedback: "Entendido, vou acelerar a fala.",
  },
  {
    patterns: [
      /velocidade\s+normal/i,
      /fal[ea]\s+normal/i,
      /ritmo\s+normal/i,
    ],
    apply: () => ({ speech_rate: "normal" }),
    feedback: "Voltando ao ritmo normal.",
  },

  // Accent
  {
    patterns: [
      /sotaque\s+carioca/i,
      /fal[ea]\s+como\s+carioca/i,
      /jeito\s+(do\s+)?rio/i,
    ],
    apply: () => ({ accent: "carioca" }),
    feedback: "Beleza, vou falar com sotaque carioca!",
  },
  {
    patterns: [
      /sotaque\s+paulist[ao]/i,
      /fal[ea]\s+como\s+paulista/i,
      /jeito\s+de\s+s[aã]o\s+paulo/i,
    ],
    apply: () => ({ accent: "paulista" }),
    feedback: "Certo, usando sotaque paulista.",
  },
  {
    patterns: [
      /sotaque\s+mineiro/i,
      /fal[ea]\s+como\s+mineiro/i,
      /jeito\s+de\s+minas/i,
    ],
    apply: () => ({ accent: "mineiro" }),
    feedback: "Uai, vou falar com sotaque mineiro, sô!",
  },
  {
    patterns: [
      /sotaque\s+ga[uú]cho/i,
      /fal[ea]\s+como\s+ga[uú]cho/i,
      /jeito\s+(do\s+)?sul/i,
    ],
    apply: () => ({ accent: "gaúcho" }),
    feedback: "Bah, tchê! Falando como gaúcho agora.",
  },
  {
    patterns: [
      /sotaque\s+nordestino/i,
      /fal[ea]\s+como\s+nordestino/i,
      /jeito\s+(do\s+)?nordeste/i,
    ],
    apply: () => ({ accent: "nordestino" }),
    feedback: "Oxe, vou falar com sotaque nordestino!",
  },
  {
    patterns: [
      /sotaque\s+neutro/i,
      /sem\s+sotaque/i,
      /sotaque\s+padr[aã]o/i,
      /tir[ae]\s+(o\s+)?sotaque/i,
    ],
    apply: () => ({ accent: "neutro" }),
    feedback: "Voltando ao sotaque neutro.",
  },
  {
    patterns: [
      /sotaque\s+portugu[eê]s/i,
      /fal[ea]\s+como\s+portugu[eê]s/i,
      /portugu[eê]s\s+de\s+portugal/i,
    ],
    apply: () => ({ accent: "português europeu" }),
    feedback: "Vou falar com sotaque de Portugal.",
  },

  // Tone
  {
    patterns: [
      /tom\s+formal/i,
      /fal[ea]\s+formal(mente)?/i,
      /seja\s+formal/i,
      /mais\s+formal/i,
    ],
    apply: () => ({ tone: "formal" }),
    feedback: "Adotando tom formal.",
  },
  {
    patterns: [
      /tom\s+casual/i,
      /fal[ea]\s+casual(mente)?/i,
      /mais\s+casual/i,
      /mais\s+descontra[ií]do/i,
      /relaxa/i,
    ],
    apply: () => ({ tone: "casual" }),
    feedback: "De boa, falando mais casual agora!",
  },
  {
    patterns: [
      /tom\s+(t[eé]cnico|profissional)/i,
      /fal[ea]\s+(de\s+forma\s+)?t[eé]cnica/i,
      /modo\s+t[eé]cnico/i,
    ],
    apply: () => ({ tone: "técnico" }),
    feedback: "Modo técnico ativado.",
  },
  {
    patterns: [
      /tom\s+amig[aá]vel/i,
      /fal[ea]\s+(de\s+forma\s+)?amig[aá]vel/i,
      /mais\s+amig[aá]vel/i,
    ],
    apply: () => ({ tone: "amigável" }),
    feedback: "Falando de forma mais amigável!",
  },

  // Special styles
  {
    patterns: [
      /sussurr[ea]/i,
      /fal[ea]\s+baixo/i,
      /fal[ea]\s+baixinho/i,
      /whisper/i,
    ],
    apply: (prefs) => ({
      extra_instructions: [...prefs.extra_instructions.filter(i => !i.includes("sussurr")), "Sussurre suavemente"],
    }),
    feedback: "Vou sussurrar...",
  },
  {
    patterns: [
      /par[ae]\s+de\s+sussurrar/i,
      /fal[ea]\s+normal/i,
      /voz\s+normal/i,
      /volume\s+normal/i,
    ],
    apply: (prefs) => ({
      extra_instructions: prefs.extra_instructions.filter(i => !i.includes("ussurr")),
      speech_rate: "normal",
    }),
    feedback: "Voltando à voz normal.",
  },
  {
    patterns: [
      /fal[ea]\s+com\s+(mais\s+)?empolgação/i,
      /mais\s+empolgado/i,
      /fal[ea]\s+animado/i,
      /mais\s+energia/i,
    ],
    apply: (prefs) => ({
      extra_instructions: [...prefs.extra_instructions.filter(i => !i.includes("empolgação")), "Fale com empolgação e energia"],
    }),
    feedback: "Vou falar com mais empolgação!",
  },
  {
    patterns: [
      /fal[ea]\s+com\s+calma/i,
      /mais\s+calmo/i,
      /fal[ea]\s+sereno/i,
      /tranquilo/i,
    ],
    apply: (prefs) => ({
      extra_instructions: [...prefs.extra_instructions.filter(i => !i.includes("calm")), "Fale com calma e serenidade"],
    }),
    feedback: "Falando com mais calma e serenidade.",
  },

  // Voice change
  {
    patterns: [/voz\s+(do\s+)?(\w+)/i],
    apply: (_prefs, match) => {
      const voiceMap: Record<string, string> = {
        charon: "Charon",
        puck: "Puck",
        zephyr: "Zephyr",
        kore: "Kore",
        fenrir: "Fenrir",
        leda: "Leda",
        orus: "Orus",
        aoede: "Aoede",
      };
      const requested = match?.[2]?.toLowerCase() || "";
      const voiceName = voiceMap[requested];
      if (voiceName) return { voice_name: voiceName };
      return {};
    },
    feedback: "Voz alterada.",
  },

  // Reset all
  {
    patterns: [
      /reset(ar)?\s+(a\s+)?voz/i,
      /voz\s+padr[aã]o/i,
      /configura[çc][aã]o\s+padr[aã]o/i,
    ],
    apply: () => ({ ...DEFAULT_PREFS }),
    feedback: "Voz restaurada para configuração padrão.",
  },
];

// ═══ Build Dynamic Style Prompt ═══

export function buildStylePrompt(prefs: VoiceStylePrefs): string {
  const parts: string[] = [];

  // Base instruction
  parts.push("Fale de forma natural e fluida em português brasileiro");

  // Accent
  if (prefs.accent && prefs.accent !== "neutro") {
    parts.push(`com sotaque ${prefs.accent}`);
  }

  // Tone
  const toneMap: Record<string, string> = {
    profissional: "tom profissional mas amigável",
    formal: "tom formal e respeitoso",
    casual: "tom casual e descontraído",
    técnico: "tom técnico e preciso",
    amigável: "tom amigável e acolhedor",
  };
  if (prefs.tone && toneMap[prefs.tone]) {
    parts.push(`usando ${toneMap[prefs.tone]}`);
  }

  // Rate
  const rateMap: Record<string, string> = {
    lento: "Fale devagar e pausadamente",
    rápido: "Fale de forma rápida e dinâmica",
    normal: "",
  };
  if (prefs.speech_rate && rateMap[prefs.speech_rate]) {
    parts.push(rateMap[prefs.speech_rate]);
  }

  // Extra instructions
  if (prefs.extra_instructions?.length) {
    parts.push(prefs.extra_instructions.join(". "));
  }

  return parts.filter(Boolean).join(". ") + ".";
}

// ═══ Detect Style Command ═══

export interface StyleCommandResult {
  matched: boolean;
  feedback: string;
  updatedPrefs: VoiceStylePrefs;
}

export function detectStyleCommand(text: string, currentPrefs: VoiceStylePrefs): StyleCommandResult {
  const normalizedText = text.trim().toLowerCase();

  for (const cmd of STYLE_COMMANDS) {
    for (const pattern of cmd.patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const changes = cmd.apply(currentPrefs, match);
        if (Object.keys(changes).length === 0) continue;

        const updatedPrefs = { ...currentPrefs, ...changes };
        // Rebuild style_prompt from the updated fields
        updatedPrefs.style_prompt = buildStylePrompt(updatedPrefs);

        return {
          matched: true,
          feedback: cmd.feedback,
          updatedPrefs,
        };
      }
    }
  }

  return { matched: false, feedback: "", updatedPrefs: currentPrefs };
}

// ═══ Persistence ═══

export async function loadVoicePrefs(): Promise<VoiceStylePrefs> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return cachedPrefs ?? { ...DEFAULT_PREFS };

    if (cachedPrefs && cachedUserId === user.id) return cachedPrefs;

    const { data, error } = await supabase
      .from("voice_style_preferences")
      .select("style_prompt, voice_name, speech_rate, accent, tone, extra_instructions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      cachedPrefs = { ...DEFAULT_PREFS };
      cachedUserId = user.id;
      return cachedPrefs;
    }

    cachedPrefs = {
      style_prompt: data.style_prompt || DEFAULT_PREFS.style_prompt,
      voice_name: data.voice_name || DEFAULT_PREFS.voice_name,
      speech_rate: data.speech_rate || DEFAULT_PREFS.speech_rate,
      accent: data.accent || DEFAULT_PREFS.accent,
      tone: data.tone || DEFAULT_PREFS.tone,
      extra_instructions: data.extra_instructions || [],
    };
    cachedUserId = user.id;
    return cachedPrefs;
  } catch {
    return cachedPrefs ?? { ...DEFAULT_PREFS };
  }
}

export async function saveVoicePrefs(prefs: VoiceStylePrefs): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    cachedPrefs = prefs;
    cachedUserId = user.id;

    await supabase.from("voice_style_preferences").upsert({
      user_id: user.id,
      style_prompt: prefs.style_prompt,
      voice_name: prefs.voice_name,
      speech_rate: prefs.speech_rate,
      accent: prefs.accent,
      tone: prefs.tone,
      extra_instructions: prefs.extra_instructions,
    }, { onConflict: "user_id" });

    console.log("[Voice Style] ✅ Saved:", prefs.accent, prefs.tone, prefs.speech_rate);
  } catch (err) {
    console.warn("[Voice Style] Save failed:", err);
  }
}

/** Get current cached prefs (sync, no DB call) */
export function getCachedVoicePrefs(): VoiceStylePrefs {
  return cachedPrefs ?? { ...DEFAULT_PREFS };
}

/** Clear cache (on logout) */
export function clearVoicePrefsCache(): void {
  cachedPrefs = null;
  cachedUserId = null;
}
